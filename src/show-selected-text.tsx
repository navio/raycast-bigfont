import { getFrontmostApplication, getSelectedText, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { CharacterGrid } from "./character-grid";

const RAYCAST_BUNDLE_ID = "com.raycast.macos";
const FOCUS_POLL_INTERVAL_MS = 150;

/**
 * Captures selected text before checking app focus. getSelectedText must run
 * immediately when Raycast is invoked, while it still has the prior app's
 * selection context.
 */
export default function ShowSelectedText() {
  const [selectedText, setSelectedText] = useState<string>();
  const latestSelectedText = useRef<string>();

  useEffect(() => {
    let disposed = false;
    let polling = false;

    async function captureSelection(showFailure: boolean) {
      try {
        const text = await getSelectedText();
        latestSelectedText.current = text;
        return text;
      } catch (error) {
        if (showFailure && !disposed) {
          await showToast({
            style: Toast.Style.Failure,
            title: "No selected text available",
            message: "Select text in another app, then invoke Copy Clear.",
          });
        }
        console.error(error);
        return undefined;
      }
    }

    async function pollFocus() {
      if (polling) return;
      polling = true;

      // Do this first: asking macOS for the frontmost app before reading the
      // selection can make the original selection unavailable.
      const capturedText = await captureSelection(false);

      try {
        const frontmostApplication = await getFrontmostApplication();
        const raycastIsFocused = frontmostApplication.bundleId === RAYCAST_BUNDLE_ID;

        if (raycastIsFocused && !disposed) {
          setSelectedText(capturedText ?? latestSelectedText.current);
        } else if (!raycastIsFocused && !disposed) {
          // Reset the displayed value while Raycast is hidden, but retain the
          // latest external selection so the next hotkey press is immediate.
          setSelectedText(undefined);
        }
      } catch (error) {
        console.error(error);
      } finally {
        polling = false;
      }
    }

    // This initial read is deliberately synchronous in the command lifecycle.
    // It is what handles the first invocation immediately.
    void captureSelection(true).then((text) => {
      if (!disposed && text !== undefined) setSelectedText(text);
    });
    void pollFocus();

    const timer = setInterval(() => void pollFocus(), FOCUS_POLL_INTERVAL_MS);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, []);

  return <CharacterGrid text={selectedText} />;
}
