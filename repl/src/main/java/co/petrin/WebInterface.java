package co.petrin;

import io.vertx.core.Vertx;
import io.vertx.core.VertxOptions;
import io.vertx.core.file.FileSystemOptions;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.handler.BodyHandler;
import io.vertx.ext.web.handler.StaticHandler;

public class WebInterface {

    /** Maximum length of scripts incoming in request bodies in bytes */
    private static long BODY_SIZE_LIMIT = 100_000; // is this enough?

    public static void main(String[] args) {
        Vertx vertx = Vertx.vertx(
            new VertxOptions()
                .setFileSystemOptions(new FileSystemOptions().setFileCachingEnabled(false).setClassPathResolvingEnabled(false)) //allow dev reloading
        );

        Router router = Router.router(vertx);
        router.post("/eval").handler(BodyHandler.create().setBodyLimit(BODY_SIZE_LIMIT)).handler(new ScriptHandler());
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
