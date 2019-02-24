package co.petrin;

import jdk.jshell.SourceCodeAnalysis;

/**
 * Makes the source code documentation object in a bean so we don't have to muck with custom Jackson serializers.
 * TODO: much with custom Jackson serializers :P
 */
public class DocumentationResponse {
    private String signature;
    private String documentation;

    public DocumentationResponse(SourceCodeAnalysis.Documentation doc) {
        this.signature = doc.signature();
        this.documentation = doc.javadoc();
    }

    public String getSignature() {
        return signature;
    }

    public String getDocumentation() {
        return documentation;
    }
}
