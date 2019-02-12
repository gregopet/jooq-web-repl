package co.petrin;

import io.vertx.core.Vertx;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.handler.StaticHandler;

public class WebInterface {

    public static void main(String[] args) {
        Vertx vertx = Vertx.vertx();

        Router router = Router.router(vertx);
        router.route("/*").handler(StaticHandler.create());

        vertx
        .createHttpServer()
        .requestHandler(router)
        .listen(8080, handler -> {
            if (handler.succeeded()) {
                System.out.println("http://localhost:8080/");
            } else {
                System.err.println("Failed to listen on port 8080");
            }
        });
    }

}
