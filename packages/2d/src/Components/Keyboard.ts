import {
  useEnableDisable,
  useType,
  useCallbackAsCurrent,
} from "@hex-engine/core";
import { Vector, Angle } from "../Models";

let firstKeyHasHappened = false;
let pendingFirstKeyHandlers: Array<() => void> = [];

/**
 * This function will run the provided function the first time a key is pressed.
 * Note that it only works if there is at least one `Keyboard` Component loaded in
 * your game when the first keypress occurs. To be on the safe side, you should
 * probably also add a Keyboard Component to the Component that calls useFirstKey.
 */
export function useFirstKey(handler: () => void) {
  pendingFirstKeyHandlers.push(useCallbackAsCurrent(handler));

  return {
    /** Whether the first keypress has happened yet. */
    get firstKeyHasHappened() {
      return firstKeyHasHappened;
    },
  };
}

/**
 * This Component provides information about which keys on the user's
 * Keyboard are currently pressed.
 */
export default function Keyboard({
  preventDefault = false,
}: {
  /**
   * If this is set to true, then `event.preventDefault()`
   * will be called on every keyboard event that goes through this Component.
   */
  preventDefault?: undefined | boolean;
} = {}) {
  useType(Keyboard);

  const pressed: Set<string> = new Set();

  const processKeydown = (event: KeyboardEvent) => {
    if (preventDefault) {
      event.preventDefault();
    }

    if (!firstKeyHasHappened) {
      firstKeyHasHappened = true;
      pendingFirstKeyHandlers.forEach((cb) => cb());
      pendingFirstKeyHandlers = [];
    }

    if (event.repeat) {
      return;
    }
    pressed.add(event.key);
  };

  const processKeyup = (event: KeyboardEvent) => {
    event.preventDefault();

    if (event.repeat) {
      return;
    }
    pressed.delete(event.key);
  };

  const { onEnabled, onDisabled } = useEnableDisable();

  onEnabled(() => {
    document.addEventListener("keydown", processKeydown);
    document.addEventListener("keyup", processKeyup);
  });

  onDisabled(() => {
    document.removeEventListener("keydown", processKeydown);
    document.removeEventListener("keyup", processKeyup);
  });

  return {
    /**
     * A Set containing the names of all the keys
     * that are currently pressed.
     *
     * For a list of which Strings will be used, check [This page on MDN](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values),
     * or press some keys and look at the values present
     * in this Set using Hex Engine's inspector.
     */
    pressed,

    /**
     * A helper function that creates a `Vector` pointing in the direction indicated by
     * the combined state of the four specified direction keys. This is mainly useful
     * in that it allows you to treat Gamepad and Keyboard inputs the same.
     *
     * @param upKey The key that represents "up", eg "w".
     * @param downKey The key that represents "down", eg "s".
     * @param leftKey The key that represents "left", eg "a".
     * @param rightKey The key that represents "right", eg "d".
     */
    vectorFromKeys(
      upKey: string,
      downKey: string,
      leftKey: string,
      rightKey: string
    ): Vector {
      const pressedKeys = pressed;
      let angle = 0;
      let magnitude = 1;

      const half = Math.PI;
      const quarter = Math.PI / 2;
      const eighth = Math.PI / 4;

      if (
        (pressedKeys.has(upKey) || pressedKeys.has(upKey.toUpperCase())) &&
        (pressedKeys.has(rightKey) || pressedKeys.has(rightKey.toUpperCase()))
      ) {
        // up right
        angle = -eighth;
      } else if (
        (pressedKeys.has(upKey) || pressedKeys.has(upKey.toUpperCase())) &&
        (pressedKeys.has(leftKey) || pressedKeys.has(leftKey.toUpperCase()))
      ) {
        // up left
        angle = half + eighth;
      } else if (
        (pressedKeys.has(downKey) || pressedKeys.has(downKey.toUpperCase())) &&
        (pressedKeys.has(rightKey) || pressedKeys.has(rightKey.toUpperCase()))
      ) {
        // down right
        angle = eighth;
      } else if (
        (pressedKeys.has(downKey) || pressedKeys.has(downKey.toUpperCase())) &&
        (pressedKeys.has(leftKey) || pressedKeys.has(leftKey.toUpperCase()))
      ) {
        // down left
        angle = quarter + eighth;
      } else if (
        (pressedKeys.has(upKey) || pressedKeys.has(upKey.toUpperCase())) &&
        !(pressedKeys.has(downKey) || pressedKeys.has(downKey.toUpperCase()))
      ) {
        // up
        angle = -quarter;
      } else if (
        (pressedKeys.has(downKey) || pressedKeys.has(downKey.toUpperCase())) &&
        !(pressedKeys.has(upKey) || pressedKeys.has(upKey.toUpperCase()))
      ) {
        // down
        angle = quarter;
      } else if (
        (pressedKeys.has(leftKey) || pressedKeys.has(leftKey.toUpperCase())) &&
        !(pressedKeys.has(rightKey) || pressedKeys.has(rightKey.toUpperCase()))
      ) {
        // left
        angle = half;
      } else if (
        (pressedKeys.has(rightKey) ||
          pressedKeys.has(rightKey.toUpperCase())) &&
        !(pressedKeys.has(leftKey) || pressedKeys.has(leftKey.toUpperCase()))
      ) {
        // right
        angle = 0;
      } else {
        magnitude = 0;
      }

      return new Vector(new Angle(angle), magnitude);
    },
  };
}
