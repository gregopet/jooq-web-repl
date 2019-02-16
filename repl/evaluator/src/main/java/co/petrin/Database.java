package co.petrin;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

import org.jooq.Constants;
import org.jooq.SQLDialect;

/** A database connection descriptor */
public class Database {

    /** An arbitrary ID used to differentiate between database connections. Unique in a single run. */
    public final int id;

    /** The connection string to use to connect to the database */
    public final String connectionString;

    /** The description to display for this database */
    public final String description;

    /** Username to use when connecting */
    public final String user;

    /** Password to use when connecting */
    public final String password;

    /** Class name of the JDBC driver*/
    public final String driver;

    /** jOOQ's SQL dialect to initialize a jOOQ context with. */
    public final org.jooq.SQLDialect sqlDialect;

    private static final String CONFIGURATION_PREFIX = "DATABASE_";
    private static final AtomicInteger idSequence = new AtomicInteger();

    public Database(String connectionString, String description, String user, String password, String driver, String sqlDialect) {
        this.id = idSequence.getAndIncrement();
        this.connectionString = connectionString;
        this.description = description;
        this.user = user;
        this.password = password;
        this.driver = driver;
        if (sqlDialect != null && !sqlDialect.isBlank()) {
            this.sqlDialect = SQLDialect.valueOf(sqlDialect);
        } else {
            this.sqlDialect = SQLDialect.DEFAULT;
        }
        if (driver != null && !driver.isBlank()) {
            try {
                Class.forName(driver);
            } catch (ClassNotFoundException ex) {
                // transform exception or be unable to use lambdas
                throw new RuntimeException(ex);
            }
        }
    }

    /** Parse available databases from the environment settings */
    public static List<Database> parseFromEnvironment() {
        return System
            .getenv()
            .keySet()
            .stream()
            .filter(key -> key.startsWith(CONFIGURATION_PREFIX) && key.endsWith("_URL"))
            .map(key -> key.substring(CONFIGURATION_PREFIX.length(), key.length() - 4))
            .map( dbName -> new Database(
                System.getenv(CONFIGURATION_PREFIX + dbName + "_URL"),
                System.getenv(CONFIGURATION_PREFIX + dbName + "_DESCRIPTION"),
                System.getenv(CONFIGURATION_PREFIX + dbName + "_USER"),
                System.getenv(CONFIGURATION_PREFIX + dbName + "_PASSWORD"),
                System.getenv(CONFIGURATION_PREFIX + dbName + "_DRIVER"),
                System.getenv(CONFIGURATION_PREFIX + dbName + "_SQLDIALECT")
            ))
            .collect(Collectors.toList());
    }

    /** Expose the jOOQ version to the outside */
    public static String getJooqVersion() {
        return Constants.VERSION;
    }

    @Override
    public String toString() {
        var sb = new StringBuilder();
        if (description != null && !description.isBlank()) {
            sb.append("Database '").append(description).append("'");
        } else {
            sb.append("Unnamed database");
        }
        if (driver != null && !driver.isBlank()) {
            sb.append(", ").append(driver).append(" ");
        } else {
            sb.append(" ");
        }
        sb.append("(").append(sqlDialect.name()).append(")");
        sb.append(" @ ").append(connectionString);
        return sb.toString();
    }
}
