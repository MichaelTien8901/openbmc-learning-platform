declare module "swagger-ui-react" {
  import { FC } from "react";

  interface SwaggerUIProps {
    spec?: object;
    url?: string;
    layout?: string;
    docExpansion?: "list" | "full" | "none";
    defaultModelsExpandDepth?: number;
    defaultModelExpandDepth?: number;
    displayOperationId?: boolean;
    filter?: boolean | string;
    showExtensions?: boolean;
    showCommonExtensions?: boolean;
    supportedSubmitMethods?: string[];
    tryItOutEnabled?: boolean;
    requestInterceptor?: (req: unknown) => unknown;
    responseInterceptor?: (res: unknown) => unknown;
    onComplete?: () => void;
    persistAuthorization?: boolean;
  }

  const SwaggerUI: FC<SwaggerUIProps>;
  export default SwaggerUI;
}
