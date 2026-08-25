import { useEffect, useState } from "react";
import { getSelectedText, showToast, Toast } from "@raycast/api";
import { CharacterGrid } from "./character-grid";

/** Displays the current selection as soon as the command opens. */
export default function ShowSelectedText() {
  const [selectedText, setSelectedText] = useState<string>();

  useEffect(() => {
    getSelectedText()
      .then((text) => setSelectedText(text))
      .catch(async (error) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "No selected text available",
          message: String(error),
        });
      });
  }, []);

  return <CharacterGrid text={selectedText} />;
}
