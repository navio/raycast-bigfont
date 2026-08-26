import { getFrontmostApplication, getSelectedText, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { CharacterGrid } from "./character-grid";

const RAYCAST_BUNDLE_ID = "com.raycast.macos";
const FOCUS_POLL_INTERVAL_MS = 200;

/**
 * Reads the selection immediately on launch, then caches selections only while
 * another application is frontmost. Calling getSelectedText while Raycast is
 * focused fails and must not be polled.
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
          console.error(error);
        }
        return undefined;
      }
    }

    async function pollFocus() {
      if (polling) return;
      polling = true;

      try {
        const frontmostApplication = await getFrontmostApplication();
        const raycastIsFocused = frontmostApplication.bundleId === RAYCAST_BUNDLE_ID;

        if (raycastIsFocused) {
          if (!disposed) setSelectedText(latestSelectedText.current);
          return;
        }

        // The source app is focused, so it is safe to cache its selection for
        // the next time the Copy Clear hotkey brings Raycast forward.
        await captureSelection(false);
        if (!disposed) setSelectedText(undefined);
      } catch (error) {
        console.error(error);
      } finally {
        polling = false;
      }
    }

    // The first invocation has no cached value, so read it immediately before
    // Raycast finishes becoming the frontmost application.
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
