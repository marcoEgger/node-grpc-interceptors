const { option, Instrumentation } = require('zipkin');

module.exports = tracer => {
    return async function (ctx, next) {
        const instrumentation = new Instrumentation.HttpServer({ tracer });

        function readHeader(header) {
            const val = ctx.call.metadata.get(header);
            if (val.length) {
                return new option.Some(val[0]);
            }
            return option.None;
        }

        const id = instrumentation.recordRequest(
            ctx.service.path,
            ctx.service.path,
            readHeader
        );

        try {
            await next();
        } catch(err) {
            instrumentation.recordResponse(id, ctx.status.code, err);
            throw err;
        }

        instrumentation.recordResponse(id, ctx.status.code);
    };
};
