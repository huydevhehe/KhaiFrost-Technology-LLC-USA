"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Bold,
  Code2,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  RemoveFormatting,
  Underline,
} from "lucide-react";
import { MediaBrowser } from "./MediaPicker";
import { isEmptyHtml, isSafeHref, sanitizeEditorHtml } from "./sanitizeHtml";
import type { MediaSelection } from "./types";

export interface RichTextEditorProps {
  /** HTML string. */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Minimum editable height in pixels (default 220). */
  minHeight?: number;
  disabled?: boolean;
  id?: string;
  /** Folder for images uploaded from the "Chèn ảnh" dialog. */
  mediaFolder?: string;
  className?: string;
  "aria-labelledby"?: string;
}

type ToolbarAction =
  | { kind: "block"; tag: "h2" | "h3" | "blockquote" | "p" }
  | { kind: "command"; command: string }
  | { kind: "link" }
  | { kind: "image" }
  | { kind: "clear" };

interface ToolbarButton {
  label: string;
  icon: React.ReactNode;
  action: ToolbarAction;
}

const TOOLBAR: ToolbarButton[] = [
  { label: "Tiêu đề 2", icon: <Heading2 size={16} />, action: { kind: "block", tag: "h2" } },
  { label: "Tiêu đề 3", icon: <Heading3 size={16} />, action: { kind: "block", tag: "h3" } },
  { label: "In đậm", icon: <Bold size={16} />, action: { kind: "command", command: "bold" } },
  { label: "In nghiêng", icon: <Italic size={16} />, action: { kind: "command", command: "italic" } },
  { label: "Gạch chân", icon: <Underline size={16} />, action: { kind: "command", command: "underline" } },
  {
    label: "Danh sách dấu chấm",
    icon: <List size={16} />,
    action: { kind: "command", command: "insertUnorderedList" },
  },
  {
    label: "Danh sách đánh số",
    icon: <ListOrdered size={16} />,
    action: { kind: "command", command: "insertOrderedList" },
  },
  { label: "Trích dẫn", icon: <Quote size={16} />, action: { kind: "block", tag: "blockquote" } },
  { label: "Chèn liên kết", icon: <Link2 size={16} />, action: { kind: "link" } },
  { label: "Chèn ảnh", icon: <ImagePlus size={16} />, action: { kind: "image" } },
  { label: "Xoá định dạng", icon: <RemoveFormatting size={16} />, action: { kind: "clear" } },
];

/** Preflight resets headings and lists, so the editable area restores them locally. */
const EDITOR_STYLES = `
.admin-rich-text h2 { font-size: 1.25rem; font-weight: 700; margin: 1rem 0 .5rem; color: #0f172a; }
.admin-rich-text h3 { font-size: 1.05rem; font-weight: 600; margin: .875rem 0 .5rem; color: #0f172a; }
.admin-rich-text h4 { font-size: .95rem; font-weight: 600; margin: .75rem 0 .5rem; color: #0f172a; }
.admin-rich-text p { margin: 0 0 .625rem; }
.admin-rich-text ul { list-style: disc; padding-left: 1.4rem; margin: 0 0 .625rem; }
.admin-rich-text ol { list-style: decimal; padding-left: 1.4rem; margin: 0 0 .625rem; }
.admin-rich-text li { margin: .2rem 0; }
.admin-rich-text blockquote { border-left: 3px solid #cbd5e1; padding-left: .75rem; color: #475569; margin: 0 0 .625rem; font-style: italic; }
.admin-rich-text a { color: #0ea5e9; text-decoration: underline; }
.admin-rich-text img { max-width: 100%; height: auto; border-radius: .5rem; margin: .5rem 0; }
.admin-rich-text hr { border: 0; border-top: 1px solid #e2e8f0; margin: 1rem 0; }
.admin-rich-text pre { background: #f1f5f9; padding: .75rem; border-radius: .5rem; overflow-x: auto; margin: 0 0 .625rem; }
.admin-rich-text code { font-family: ui-monospace, monospace; font-size: .85em; }
.admin-rich-text table { border-collapse: collapse; width: 100%; margin: 0 0 .625rem; }
.admin-rich-text th, .admin-rich-text td { border: 1px solid #e2e8f0; padding: .35rem .5rem; text-align: left; }
`;

/**
 * contentEditable HTML editor with no third-party dependency. The live DOM is
 * only rewritten when `value` changes from outside while the editor is blurred,
 * so the caret never jumps while typing; the emitted HTML is always normalised.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Nhập nội dung…",
  minHeight = 220,
  disabled = false,
  id,
  mediaFolder,
  className = "",
  "aria-labelledby": ariaLabelledBy,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const focusedRef = useRef(false);
  const savedRange = useRef<Range | null>(null);
  const [sourceMode, setSourceMode] = useState(false);
  const [source, setSource] = useState(value);
  const [notice, setNotice] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const generatedId = useId();
  const editorId = id ?? generatedId;

  useEffect(() => {
    try {
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch {
      // Older engines simply keep their own separator.
    }
  }, []);

  // Pull external changes in only while the user is not typing.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || sourceMode) return;
    if (focusedRef.current) return;
    if (editor.innerHTML === value) return;
    editor.innerHTML = value ?? "";
  }, [value, sourceMode]);

  const emit = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(sanitizeEditorHtml(editor.innerHTML));
  }, [onChange]);

  const exec = useCallback(
    (command: string, argument?: string) => {
      if (disabled) return;
      const editor = editorRef.current;
      if (!editor) return;
      editor.focus();
      try {
        document.execCommand(command, false, argument);
      } catch {
        setNotice("Trình duyệt không hỗ trợ thao tác này.");
        return;
      }
      emit();
    },
    [disabled, emit],
  );

  const currentBlock = useCallback((): string => {
    try {
      return String(document.queryCommandValue("formatBlock") || "").toLowerCase();
    } catch {
      return "";
    }
  }, []);

  const applyBlock = useCallback(
    (tag: string) => {
      const next = currentBlock() === tag ? "p" : tag;
      exec("formatBlock", `<${next}>`);
    },
    [currentBlock, exec],
  );

  const insertLink = useCallback(() => {
    const input = window.prompt("Nhập đường dẫn (http://, https://, mailto: hoặc /duong-dan)", "https://");
    if (input === null) return;
    const href = input.trim();
    if (href === "") {
      exec("unlink");
      return;
    }
    if (!isSafeHref(href)) {
      setNotice("Đường dẫn không hợp lệ. Chỉ chấp nhận http, https, mailto hoặc đường dẫn nội bộ.");
      return;
    }
    setNotice(null);
    exec("createLink", href);
  }, [exec]);

  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current?.contains(range.commonAncestorContainer)) {
      savedRange.current = range.cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const range = savedRange.current;
    if (!range) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, []);

  const insertImage = useCallback(
    (selection: MediaSelection) => {
      restoreSelection();
      const src = selection.url.replace(/"/g, "&quot;");
      const alt = selection.name.replace(/"/g, "&quot;");
      exec("insertHTML", `<img src="${src}" alt="${alt}" />`);
    },
    [exec, restoreSelection],
  );

  const runAction = useCallback(
    (action: ToolbarAction) => {
      setNotice(null);
      if (action.kind === "block") applyBlock(action.tag);
      else if (action.kind === "command") exec(action.command);
      else if (action.kind === "link") insertLink();
      else if (action.kind === "image") {
        saveSelection();
        setPickerOpen(true);
      } else exec("removeFormat");
    },
    [applyBlock, exec, insertLink, saveSelection],
  );

  const toggleSource = useCallback(() => {
    if (sourceMode) {
      const normalised = sanitizeEditorHtml(source);
      onChange(normalised);
      const editor = editorRef.current;
      if (editor) editor.innerHTML = normalised;
      setSourceMode(false);
    } else {
      setSource(editorRef.current?.innerHTML ?? value);
      setSourceMode(true);
    }
  }, [sourceMode, source, value, onChange]);

  const empty = isEmptyHtml(value);

  return (
    <div className={`rounded-lg border border-slate-200 bg-white ${className}`}>
      <style>{EDITOR_STYLES}</style>
      <div
        role="toolbar"
        aria-label="Định dạng nội dung"
        aria-controls={editorId}
        className="flex flex-wrap items-center gap-1 rounded-t-lg border-b border-slate-200 bg-slate-50 px-2 py-1.5"
      >
        {TOOLBAR.map((button) => (
          <button
            key={button.label}
            type="button"
            title={button.label}
            aria-label={button.label}
            disabled={disabled || sourceMode}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runAction(button.action)}
            className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-600 transition-colors hover:bg-white hover:text-slate-900 focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-40"
          >
            {button.icon}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <button
          type="button"
          title="Sửa mã HTML"
          aria-label="Sửa mã HTML"
          aria-pressed={sourceMode}
          disabled={disabled}
          onClick={toggleSource}
          className={`inline-flex h-8 items-center gap-1.5 rounded px-2 text-xs font-medium transition-colors focus:ring-2 focus:ring-accent/30 focus:outline-none disabled:opacity-40 ${
            sourceMode ? "bg-accent text-white" : "text-slate-600 hover:bg-white hover:text-slate-900"
          }`}
        >
          <Code2 size={15} />
          HTML
        </button>
      </div>

      {sourceMode ? (
        <textarea
          id={editorId}
          value={source}
          disabled={disabled}
          aria-labelledby={ariaLabelledBy}
          spellCheck={false}
          onChange={(event) => {
            setSource(event.target.value);
            onChange(event.target.value);
          }}
          style={{ minHeight }}
          className="w-full resize-y rounded-b-lg bg-slate-900 px-3.5 py-3 font-mono text-xs text-slate-100 outline-none"
        />
      ) : (
        <div className="relative">
          {empty && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-3 left-3.5 text-sm text-slate-400"
            >
              {placeholder}
            </span>
          )}
          <div
            id={editorId}
            ref={editorRef}
            role="textbox"
            aria-multiline="true"
            aria-labelledby={ariaLabelledBy}
            aria-disabled={disabled || undefined}
            tabIndex={0}
            contentEditable={!disabled}
            suppressContentEditableWarning
            onInput={emit}
            onFocus={() => {
              focusedRef.current = true;
            }}
            onBlur={() => {
              focusedRef.current = false;
              const editor = editorRef.current;
              if (!editor) return;
              const normalised = sanitizeEditorHtml(editor.innerHTML);
              if (normalised !== editor.innerHTML) editor.innerHTML = normalised;
              onChange(normalised);
            }}
            style={{ minHeight }}
            className="admin-rich-text w-full rounded-b-lg px-3.5 py-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
      )}

      {notice && (
        <p role="alert" className="border-t border-amber-100 bg-amber-50 px-3.5 py-2 text-xs text-amber-700">
          {notice}
        </p>
      )}

      {pickerOpen && (
        <MediaBrowser
          open
          onClose={() => setPickerOpen(false)}
          multiple={false}
          accept="image"
          folder={mediaFolder}
          initialSelected={[]}
          onConfirm={(selection) => {
            setPickerOpen(false);
            const picked = selection[0];
            // Insert after the dialog has closed so the caret is back in the editor.
            if (picked) window.setTimeout(() => insertImage(picked), 0);
          }}
        />
      )}
    </div>
  );
}
