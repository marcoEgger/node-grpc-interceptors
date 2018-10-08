const { HttpLogger } = require('zipkin-transport-http');
const { Tracer, BatchRecorder } = require('zipkin');
const AsyncContext = require('@hpidcock/zipkin-context-async-hooks');

module.exports = localServiceName => {
    let recorder;

    if (process.env.ZIPKIN_URL) {
        recorder = new BatchRecorder({
            logger: new HttpLogger({
                endpoint: process.env.ZIPKIN_URL,
            }),
        });
    } else {
        recorder = {
            record() {},
        };
    }

    return new Tracer({
        ctxImpl: AsyncContext,
        recorder,
        localServiceName,
    });
};
