import { getFrontmostApplication, getSelectedText, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { CharacterGrid } from "./character-grid";

const RAYCAST_BUNDLE_ID = "com.raycast.macos";
const FOCUS_POLL_INTERVAL_MS = 400;

/**
 * Refreshes the text whenever Raycast regains focus. Clearing state while
 * Raycast is hidden makes a subsequent hotkey invocation read a new selection.
 */
export default function ShowSelectedText() {
  const [selectedText, setSelectedText] = useState<string>();

  useEffect(() => {
    let disposed = false;
    let raycastWasFocused = false;

    async function refreshOnFocus() {
      try {
        const frontmostApplication = await getFrontmostApplication();
        const raycastIsFocused = frontmostApplication.bundleId === RAYCAST_BUNDLE_ID;

        if (!raycastIsFocused) {
          raycastWasFocused = false;
          if (!disposed) setSelectedText(undefined);
          return;
        }

        if (raycastWasFocused) return;
        raycastWasFocused = true;

        const text = await getSelectedText();
        if (!disposed) setSelectedText(text);
      } catch (error) {
        if (!disposed) {
          setSelectedText("");
          await showToast({
            style: Toast.Style.Failure,
            title: "No selected text available",
            message: "Select text in another app, then invoke Copy Clear.",
          });
        }
        console.error(error);
      }
    }

    void refreshOnFocus();
    const timer = setInterval(() => void refreshOnFocus(), FOCUS_POLL_INTERVAL_MS);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, []);

  return <CharacterGrid text={selectedText} />;
}
