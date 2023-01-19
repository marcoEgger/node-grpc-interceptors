const grpc = require('@grpc/grpc-js');
const { Instrumentation } = require('zipkin');

module.exports = tracer => {
    return (options, nextCall) => {
        const instrumentation = new Instrumentation.HttpClient({ tracer });
        return new grpc.InterceptingCall(nextCall(options), {
            start: (metadata, listener, next) => {
                // add zipkin trace data to request metadata
                const { headers } = instrumentation.recordRequest(
                    {},
                    options.method_definition.path,
                    options.method_definition.path,
                );
                const id = tracer.id;

                for(const k in headers) {
                    metadata.add(k, headers[k]);
                }

                next(metadata, {
                    onReceiveMetadata: (metadata, next) => {
                        next(metadata);
                    },
                    onReceiveMessage: (message, next) => {
                        next(message);
                    },
                    onReceiveStatus: (status, next) => {
                        if (status) {
                            if (status.code !== grpc.status.OK) {
                                instrumentation.recordError(id, status.details);
                            } else {
                                instrumentation.recordResponse(id, status.code);
                            }
                        }
                        next(status);
                    },
                });
            },
            sendMessage: (message, next) => {
                next(message);
            },
            halfClose: (next) => {
                next();
            },
        });
    };
};
