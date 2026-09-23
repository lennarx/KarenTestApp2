"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function ApiDocsPage() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white" data-testid="swagger-ui">
      <SwaggerUI url="/api/swagger" docExpansion="list" persistAuthorization />
    </div>
  );
}
