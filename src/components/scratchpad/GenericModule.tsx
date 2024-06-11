import { SendIcon, ShareIcon } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  VerticalResizeHandle,
} from "../../ui/resizable";
import {
  MarkdownEditor,
  type MilkdownEditorCreatedArgs,
} from "../MarkdownEditor";
import { AiModelDropdown } from "../AiModelDropdown";
import { formatCurrencyForDisplay } from "../../lib/content-script/format";
import {
  generatePrompt,
  type Prompt,
} from "../../lib/content-script/prompt-template";
import { Button } from "../../ui/button";
import { useTranslation, Trans } from "react-i18next";
import {
  useCallback,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { sendPrompt } from "../../lib/content-script/prompt";
import type { WritableAtom } from "nanostores";
import { useDebouncedCallback } from "use-debounce";
import { Textarea } from "../../ui/textarea";
import type { ModelName } from "../../lib/worker/llm/prompt";
import { Input } from "../../ui/input";

export interface CallbackArgs {
  editorContent: string;
  prompt: string;
  promptPrepared: Prompt;
  setPromptPrepared: (prompt: Prompt) => void;
  setEditorContent: (content: string) => void;
  setPrompt: (prompt: string) => void;
}

export interface GenericModuleProps extends PropsWithChildren {
  name: string;
  editorAtom: WritableAtom<string>;
  defaultPromptTemplate: string;
  outputTokenScaleFactor: number;
  defaultModelName: ModelName;
  getPromptValues: () => Record<string, string>;
  onEditorCreated?: (args: CallbackArgs) => void;
  onEditorChange?: (args: CallbackArgs) => void;
  onPromptChange?: (args: CallbackArgs) => void;
  onPromptShare?: (args: CallbackArgs) => void;
}

export const GenericModule: React.FC<GenericModuleProps> = ({
  name,
  editorAtom,
  defaultPromptTemplate,
  outputTokenScaleFactor,
  defaultModelName,
  onEditorCreated,
  onEditorChange,
  onPromptChange,
  onPromptShare,
  getPromptValues,
  children,
}) => {
  const { t, i18n } = useTranslation();
  const [editorContent, setEditorContent] = useState<string>(editorAtom.get());
  const [prompt, setPrompt] = useState<string>(defaultPromptTemplate);
  const [promptPrepared, setPromptPrepared] = useState<Prompt>({
    original: defaultPromptTemplate,
    text: "",
    encoded: [],
    price: 0,
    priceOutput: 0,
    priceInput: 0,
  });

  /*
  useEffect(() => {
    if (typeof onEditorCreated === "function") {
      onEditorCreated({
        editorContent,
        prompt,
        setEditorContent,
        setPrompt,
        promptPrepared,
        setPromptPrepared,
      });
    }
  }, [
    editorContent,
    prompt,
    promptPrepared,
    setEditorContent,
    setPrompt,
    setPromptPrepared,
  ]);
  */

  useEffect(() => {
    if (typeof onEditorCreated === "function") {
      onEditorCreated({
        editorContent,
        prompt,
        setEditorContent,
        setPrompt,
        promptPrepared,
        setPromptPrepared,
      });
    }
  }, []);

  // sync editor content with extraction
  const onEditorChangeInternal = useCallback(
    (markdown: string) => {
      setEditorContent(markdown);
    },
    [setEditorContent],
  );

  const onEditorCreatedInternal = useCallback(
    ({ editor }: MilkdownEditorCreatedArgs) => {
      console.log("editor created", editor);
    },
    [],
  );

  const onSharePromptClick = useCallback(() => {
    console.log("share prompt", promptPrepared);
  }, [promptPrepared]);

  // sync prompt with editor content
  const onPromptChangeInternal = useCallback(
    (evt: any) => {
      setPrompt(evt.target?.value);
    },
    [setPrompt],
  );

  const debouncedPreparePrompt = useDebouncedCallback(
    useCallback(({ editorContent, prompt }) => {
      requestAnimationFrame(() => {
        setPromptPrepared(
          generatePrompt<Record<string, string>>(
            prompt,
            {
              CONTENT: editorContent,
              ...getPromptValues(),
            },
            defaultModelName,
            outputTokenScaleFactor,
          ),
        );
      });
    }, []),
    250,
    { maxWait: 500 },
  );

  useEffect(() => {
    debouncedPreparePrompt({ editorContent, prompt });
  }, [editorContent, prompt]);

  useEffect(() => {
    // cache the editor content
    editorAtom.set(editorContent);
  }, [editorContent]);

  const onPromptSendClick = useCallback(() => {
    // actualy send the prompt to the AI
    console.log("send prompt", promptPrepared);

    let isBeginning = true;

    sendPrompt(
      promptPrepared.text,
      (text: string) => {
        console.log("onChunk", text);
        setEditorContent(
          (prev) => `${prev || ""}${isBeginning ? "\n---\n" : ""}${text || ""}`,
        );

        isBeginning = false;
      },
      (lastChunkText: string) => {
        console.log("onDone", lastChunkText);

        setEditorContent((prev) => `${prev || ""}${lastChunkText || ""}`);
      },
    );
  }, [promptPrepared]);

  return (
    <ResizablePanelGroup direction="vertical">
      <ResizablePanel defaultSize={65} minSize={20}>
        <div className="ab-w-full ab-h-full ab-overflow-y-auto">
          <MarkdownEditor
            defaultValue={editorContent}
            placeholder={"Extrahierte Inhalte"}
            name={`${name}Editor`}
            showToolbar={true}
            onChange={onEditorChangeInternal}
            onCreated={onEditorCreatedInternal}
          />
        </div>
      </ResizablePanel>
      <VerticalResizeHandle withHandle />
      <ResizablePanel defaultSize={35} minSize={20}>
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel
            defaultSize={30}
            minSize={10}
            className="ab-h-full ab-flex ab-flex-col ab-w-full ab-pr-2"
          >
            <div className="ab-ftr-bg ab-flex ab-flex-row ab-justify-between ab-rounded-sm !ab-h-7 ab-items-center">
              <span className="ab-flex ab-flex-row ab-p-1 ab-px-2 ab-text-sm">
                Einstellungen
              </span>
            </div>
            <div className="ab-flex ab-h-full ab-items-center ab-justify-center ab-p-2">
              {children}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="ml-1 mr-1" />

          <ResizablePanel
            defaultSize={70}
            minSize={60}
            className="ab-h-full ab-flex ab-flex-col ab-w-full ab-pl-2"
          >
            <div className="ab-ftr-bg ab-flex ab-flex-row ab-justify-between ab-rounded-sm !ab-h-7 ab-items-center">
              <span className="ab-flex ab-flex-row ab-items-center">
                <span className="ab-p-1 ab-px-2 ab-text-sm">Smart-Prompt:</span>
                <AiModelDropdown
                  value={defaultModelName}
                  options={[
                    {
                      label: "OpenAI GPT-4o",
                      value: "gpt-4o",
                    },
                    {
                      label: "Perplexity Sonar",
                      value: "perplexity-sonar",
                    },
                  ]}
                />
              </span>

              <Button
                size={"sm"}
                className="ab-scale-75 ab-ftr-button ab-mr-0 !ab-h-6 hover:!ab-bg-primary-foreground"
                onClick={onSharePromptClick}
              >
                <ShareIcon className="ab-w-4 ab-h-4" />
                <span>Teilen</span>
              </Button>
            </div>
            <textarea
              onChange={onPromptChangeInternal}
              name={`${name}PromptEditor`}
              placeholder="Change the extracted content to re-generate the prompt"
              value={prompt}
              style={{ resize: "none" }}
              className="ab-flex-1 ab-overflow-auto ab-w-full  ab-overscroll-contain ab-ml-1 ab-p-2 ab-outline-none !ab-text-sm"
            />
            <div className="ab-flex ab-flex-col ab-ml-0 ab-mr-0 ab-pr-0 ab-justify-between">
              <span className="ab-flex ab-flex-row ab-justify-between ab-items-end">
                <Input
                  name={`${name}PromptInstructionEditor`}
                  placeholder="Spezialisierungswünsche..."
                  className="!ab-block ab-mb-2 !ab-text-sm ab-h-12 ab-max-h-12"
                />
                <Button
                  size={"sm"}
                  className="ab-scale-75 ab-ftr-button ab-mr-0 !ab-h-14 !ab-w-14 !ab-rounded-full hover:!ab-bg-primary-foreground"
                  onClick={onPromptSendClick}
                >
                  <SendIcon className="ab-w-12 ab-h-12" />
                </Button>
              </span>
              <span
                className="ab-p-1 ab-px-2 !ab-text-xs ab-ftr-bg ab-rounded-sm"
                style={{ fontSize: "0.9rem" }}
              >
                Tokens: {promptPrepared.encoded.length} I/O ~
                {promptPrepared.estimatedOutputTokens} ≈{" "}
                {formatCurrencyForDisplay(
                  promptPrepared.price.toFixed(2),
                ).replace(".", ",")}
                {/*
                €; verbleibende Tokens:{" "}
                {formatCurrencyForDisplay(
                  calculateTokensFromBudget(20 ),
                )}
                */}
              </span>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};