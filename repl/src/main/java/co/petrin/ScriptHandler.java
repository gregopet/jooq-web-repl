package co.petrin;

import io.vertx.core.Handler;
import io.vertx.ext.web.RoutingContext;

/** Handles scripts sent for execution */
public class ScriptHandler implements Handler<RoutingContext> {
    @Override
    public void handle(RoutingContext ctx) {
        Evaluator evaluator = new Evaluator();
        ctx.response().end(evaluator.evaluate(ctx.getBodyAsString()));
    }
}
