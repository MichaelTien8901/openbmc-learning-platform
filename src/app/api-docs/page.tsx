"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  ),
});

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<object | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/docs")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setSpec(data);
        }
      })
      .catch((err) => {
        setError(err.message);
      });
  }, []);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Error Loading Documentation</h1>
          <p className="mt-2 text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="api-docs-container">
      <style jsx global>{`
        .api-docs-container {
          background: #fafafa;
          min-height: 100vh;
        }
        .swagger-ui .topbar {
          display: none;
        }
        .swagger-ui .info {
          margin: 30px 0;
        }
        .swagger-ui .info .title {
          font-size: 2rem;
        }
        .swagger-ui .opblock-tag {
          font-size: 1.25rem;
        }
        .swagger-ui .opblock .opblock-summary-operation-id {
          font-size: 0.875rem;
        }
        .swagger-ui .btn {
          border-radius: 4px;
        }
        .swagger-ui select {
          border-radius: 4px;
        }
        .swagger-ui input[type="text"] {
          border-radius: 4px;
        }
        .swagger-ui textarea {
          border-radius: 4px;
        }
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .api-docs-container {
            background: #1a1a1a;
          }
          .swagger-ui,
          .swagger-ui .info .title,
          .swagger-ui .info .base-url,
          .swagger-ui .opblock-tag,
          .swagger-ui .opblock .opblock-summary-description,
          .swagger-ui table thead tr td,
          .swagger-ui table thead tr th,
          .swagger-ui .parameter__name,
          .swagger-ui .parameter__type,
          .swagger-ui .response-col_status,
          .swagger-ui .response-col_description,
          .swagger-ui .model-title {
            color: #e0e0e0;
          }
          .swagger-ui .opblock .opblock-section-header {
            background: #2a2a2a;
          }
          .swagger-ui section.models {
            border-color: #444;
          }
          .swagger-ui section.models .model-container {
            background: #2a2a2a;
          }
        }
      `}</style>
      <SwaggerUI spec={spec} />
    </div>
  );
}
