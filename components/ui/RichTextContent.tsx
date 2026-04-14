/**
 * Renders saved HTML content from the rich text editor (Tiptap).
 * Applies consistent typography styles via Tailwind prose-like classes.
 *
 * Usage:
 *   <RichTextContent html={ad.description} />
 */

interface RichTextContentProps {
  html: string;
  className?: string;
}

export default function RichTextContent({
  html,
  className = "",
}: RichTextContentProps) {
  return (
    <div
      className={`rich-text-content break-words [overflow-wrap:anywhere]
        [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:first:mt-0
        [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mt-3 [&_h3]:mb-1
        [&_p]:text-gray-700 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:my-1.5 [&_p]:first:mt-0 [&_p]:last:mb-0
        [&_ul]:list-disc [&_ul]:list-outside [&_ul]:ml-5 [&_ul]:my-2 [&_ul]:space-y-1
        [&_ol]:list-decimal [&_ol]:list-outside [&_ol]:ml-5 [&_ol]:my-2 [&_ol]:space-y-1
        [&_li]:text-sm [&_li]:leading-relaxed [&_li]:text-gray-700
        [&_strong]:font-semibold [&_strong]:text-gray-900
        [&_em]:italic
        [&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-800
        md:[&_h2]:text-xl md:[&_p]:text-base md:[&_li]:text-base
        ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
