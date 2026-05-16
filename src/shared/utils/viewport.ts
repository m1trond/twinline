export function getViewportSize() {
  if (typeof window === "undefined") {
    return { height: 0, width: 0 };
  }

  return {
    height: window.visualViewport?.height ?? window.innerHeight,
    width: window.visualViewport?.width ?? window.innerWidth,
  };
}

export function clampPanelPosition(
  position: { left: number; top: number },
  isCollapsed: boolean,
) {
  if (typeof window === "undefined") {
    return position;
  }

  const panelWidth = isCollapsed ? 260 : 350;
  const panelHeight = isCollapsed ? 92 : 310;
  const viewport = getViewportSize();

  return {
    left: Math.max(12, Math.min(position.left, viewport.width - panelWidth - 12)),
    top: Math.max(12, Math.min(position.top, viewport.height - panelHeight - 12)),
  };
}

export function getCenteredCallPanelPosition(isCollapsed: boolean) {
  if (typeof window === "undefined") {
    return { left: 0, top: 0 };
  }

  const panelWidth = isCollapsed ? 260 : 350;
  const panelHeight = isCollapsed ? 92 : 310;
  const viewport = getViewportSize();

  return clampPanelPosition(
    {
      left: (viewport.width - panelWidth) / 2,
      top: (viewport.height - panelHeight) / 2,
    },
    isCollapsed,
  );
}
