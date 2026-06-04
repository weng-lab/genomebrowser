# Glossary

## Browser

The browser is the top-level orchestration layer that coordinates state, data loading, viewport behavior, rendering, and interactions. In v2, the browser should stay generic and avoid owning track-specific behavior directly.

## Track

A track is one rendered row of genomic data in the browser. Examples include signal tracks such as BigWig, interval tracks such as BigBed, and transcript tracks.

## Track config

A track config is the **runtime** configuration object stored in track state that tells the browser how to render a track. It includes shared fields such as `id`, `type`, `title`, `display`, `height`, and `color`, plus module-specific fields that can change track behavior at runtime.

## Track module

A track module is a self-contained unit that defines one track type. It owns that track's config shape, creation, validation, fetch logic, renderers, display modes, and optional settings component.

## Renderer

A renderer is the React component a track module uses to draw a track for one display mode. The browser chooses the renderer from the module's `render` map using the track config's `display` value.

## Display mode

A display mode is a named rendering style for a track, such as `full`, `dense`, `squish`, or `pack`. Display modes are defined by the keys of a track module's `render` map.

## Settings modal

The settings modal is the browser-owned UI surface opened from a track's settings button. It renders the modal component (`modalComponent`), then the base settings component (`baseSettingsComponent`), then the active track module's settings component (`settingsComponent`).

## Modal component

The modal component owns the settings modal shell, including layout, styling, header, close controls, and where child settings panels appear. Apps can replace it through the settings store's `modalComponent` override.

## Base settings

Base settings are the shared settings controls that apply to all tracks, such as title, color, height, and display mode. Apps can replace the base settings component through the settings store's `baseSettingsComponent` override.

## Module settings

Module settings are track-type-specific controls supplied by a track module's `settingsComponent`. They are rendered inside the settings modal after base settings.

## Settings store

The settings store owns the active settings modal state and the browser-level settings UI component overrides. The browser creates it internally by default, but apps can provide one when they need custom settings UI.

## Built-in track

A built-in track is a track type shipped with v2, such as BigWig, BigBed, or Transcript. Built-in tracks can still be wrapped or cloned by apps to override module-level behavior.

## Custom track module

A custom track module is an app-defined module registered with the browser to add a new track type or specialize an existing one. Custom modules can provide their own renderers and settings component.
