const grpc = require('grpc');
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
                        if (status.code !== grpc.status.OK) {
                            instrumentation.recordError(tracer.id, status.details);
                        } else {
                            instrumentation.recordResponse(tracer.id, status.code);
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
