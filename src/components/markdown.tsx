"use client";

import { createContext, createElement, useContext, type JSX } from "react";
import Link from "next/link";
import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";

import type { LinkResolver } from "@/lib/link-resolver";
import { cn } from "@/lib/utils";

import "./markdown.css";

type IntrinsicTag = keyof JSX.IntrinsicElements;

/**
 * Builds a renderer for a single Markdown tag that applies `className` and
 * drops react-markdown's `node` prop so it never reaches the DOM. Styling lives
 * in `markdown.css`, keyed off these classes — so each tag is customised in
 * isolation rather than through one descendant-selector blob.
 */
function styled<Tag extends IntrinsicTag>(tag: Tag, className: string) {
  function StyledTag({ node, ...props }: JSX.IntrinsicElements[Tag] & ExtraProps) {
    void node;
    return createElement(tag, { className, ...props });
  }
  StyledTag.displayName = `Markdown.${tag}`;
  return StyledTag;
}

const LinkResolverContext = createContext<LinkResolver | null>(null);

const MarkdownAnchor = styled("a", "markdown-a");

function MarkdownLink({ node, href, ...props }: JSX.IntrinsicElements["a"] & ExtraProps) {
  void node;
  const resolveLink = useContext(LinkResolverContext);
  const internal = href && resolveLink ? resolveLink(href) : null;
  // A file can hold dozens of links, each one a prefetch of the same page.
  if (internal) return <Link className="markdown-a" {...props} href={internal} prefetch={false} />;
  return <MarkdownAnchor {...props} href={href} />;
}
MarkdownLink.displayName = "Markdown.a";

const components: Components = {
  h1: styled("h1", "markdown-h1"),
  h2: styled("h2", "markdown-h2"),
  h3: styled("h3", "markdown-h3"),
  h4: styled("h4", "markdown-h4"),
  p: styled("p", "markdown-p"),
  ul: styled("ul", "markdown-ul"),
  ol: styled("ol", "markdown-ol"),
  li: styled("li", "markdown-li"),
  a: MarkdownLink,
  code: styled("code", "markdown-code"),
  pre: styled("pre", "markdown-pre"),
  blockquote: styled("blockquote", "markdown-blockquote"),
  table: styled("table", "markdown-table"),
  th: styled("th", "markdown-th"),
  td: styled("td", "markdown-td"),
  hr: styled("hr", "markdown-hr"),
};

/**
 * Renders a Markdown string (GFM) with the shared Clinia styling. The links `resolveLink` maps
 * navigate inside the app.
 */
export function Markdown({
  children,
  className,
  resolveLink,
}: {
  children: string;
  className?: string;
  resolveLink: LinkResolver;
}) {
  return (
    <div className={cn("markdown", className)}>
      <LinkResolverContext.Provider value={resolveLink}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {children}
        </ReactMarkdown>
      </LinkResolverContext.Provider>
    </div>
  );
}
