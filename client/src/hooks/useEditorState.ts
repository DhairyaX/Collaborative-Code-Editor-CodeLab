import { useState } from "react";

export type EditorLanguage = "javascript" | "python" | "c" | "cpp" | "java";

export type LanguageCodeMap = Record<EditorLanguage, string>;

const SUPPORTED_LANGUAGES: EditorLanguage[] = ["javascript", "python", "c", "cpp", "java"];

export const DEFAULT_SNIPPETS: LanguageCodeMap = {
  javascript: [
    "function greet(name) {",
    "  return `Hello, ${name}!`;",
    "}",
    "",
    "console.log(greet(\"CodeLab\"));"
  ].join("\n"),
  python: [
    "def greet(name):",
    "    return f\"Hello, {name}!\"",
    "",
    "print(greet(\"CodeLab\"))"
  ].join("\n"),
  c: [
    "#include <stdio.h>",
    "",
    "int main(void) {",
    "  printf(\"Hello, CodeLab!\\n\");",
    "  return 0;",
    "}"
  ].join("\n"),
  cpp: [
    "#include <iostream>",
    "",
    "int main() {",
    "  std::cout << \"Hello, CodeLab!\" << std::endl;",
    "  return 0;",
    "}"
  ].join("\n"),
  java: [
    "public class Main {",
    "  public static void main(String[] args) {",
    "    System.out.println(\"Hello, CodeLab!\");",
    "  }",
    "}"
  ].join("\n")
};

const LANGUAGE_STORAGE_KEY = "codelab.editor.language";

function getInitialLanguage(): EditorLanguage {
  const storedValue = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

  if (SUPPORTED_LANGUAGES.includes(storedValue as EditorLanguage)) {
    return storedValue as EditorLanguage;
  }

  return "javascript";
}

export function useEditorState(roomId: string) {
  const [language, setLanguageState] = useState<EditorLanguage>(getInitialLanguage);

  const setLanguage = (nextLanguage: EditorLanguage) => {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  };

  return {
    roomId,
    language,
    setLanguage
  };
}
