package co.petrin;

import io.vertx.core.Vertx;
import io.vertx.core.VertxOptions;
import io.vertx.core.file.FileSystemOptions;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.handler.StaticHandler;

public class WebInterface {

    public static void main(String[] args) {
        Vertx vertx = Vertx.vertx(
            new VertxOptions()
                .setFileSystemOptions(new FileSystemOptions().setFileCachingEnabled(false).setClassPathResolvingEnabled(false)) //allow dev reloading
        );

        Router router = Router.router(vertx);
        router.route("/test-ajax").handler(rc -> rc.response().end("remote content"));
        router.route("/*").handler(
            StaticHandler.create()
                .setFilesReadOnly(false).setWebRoot("src/main/resources/webroot") // allow dev reloading
        );

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
