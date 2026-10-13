const base = process.env.DOCS_BASE || "";
export default { output: "export", basePath: base, trailingSlash: true, images: { unoptimized: true }, env: { NEXT_PUBLIC_BASE: base } };
