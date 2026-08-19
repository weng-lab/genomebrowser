import { describe, expect, expectTypeOf, it } from "vitest";
import {
  TrackSettingsColorField,
  TrackSettingsFieldGrid,
  TrackSettingsFieldRow,
  TrackSettingsFullRow,
  TrackSettingsLayout,
  TrackSettingsNumberField,
  TrackSettingsRangeFields,
  TrackSettingsSection,
  TrackSettingsTextField,
  TrackSettingsUrlField,
  type TrackSettingsColorFieldProps,
  type TrackSettingsFieldGridProps,
  type TrackSettingsFieldRowProps,
  type TrackSettingsFullRowProps,
  type TrackSettingsLayoutProps,
  type TrackSettingsNumberFieldProps,
  type TrackSettingsRangeFieldsProps,
  type TrackSettingsSectionProps,
  type TrackSettingsTextFieldProps,
  type TrackSettingsUrlFieldProps,
} from "@weng-lab/genomebrowser-tracks/settings";

describe("public track settings authoring API", () => {
  it("exports every authoring component", () => {
    const components = [
      TrackSettingsColorField,
      TrackSettingsFieldGrid,
      TrackSettingsFieldRow,
      TrackSettingsFullRow,
      TrackSettingsLayout,
      TrackSettingsNumberField,
      TrackSettingsRangeFields,
      TrackSettingsSection,
      TrackSettingsTextField,
      TrackSettingsUrlField,
    ];

    for (const component of components) expect(component).toBeTypeOf("function");
  });

  it("exports each component's package-owned props", () => {
    expectTypeOf(TrackSettingsColorField)
      .parameter(0)
      .toEqualTypeOf<TrackSettingsColorFieldProps>();
    expectTypeOf(TrackSettingsFieldGrid).parameter(0).toEqualTypeOf<TrackSettingsFieldGridProps>();
    expectTypeOf(TrackSettingsFieldRow).parameter(0).toEqualTypeOf<TrackSettingsFieldRowProps>();
    expectTypeOf(TrackSettingsFullRow).parameter(0).toEqualTypeOf<TrackSettingsFullRowProps>();
    expectTypeOf(TrackSettingsLayout).parameter(0).toEqualTypeOf<TrackSettingsLayoutProps>();
    expectTypeOf(TrackSettingsNumberField)
      .parameter(0)
      .toEqualTypeOf<TrackSettingsNumberFieldProps>();
    expectTypeOf(TrackSettingsRangeFields)
      .parameter(0)
      .toEqualTypeOf<TrackSettingsRangeFieldsProps>();
    expectTypeOf(TrackSettingsSection).parameter(0).toEqualTypeOf<TrackSettingsSectionProps>();
    expectTypeOf(TrackSettingsTextField).parameter(0).toEqualTypeOf<TrackSettingsTextFieldProps>();
    expectTypeOf(TrackSettingsUrlField).parameter(0).toEqualTypeOf<TrackSettingsUrlFieldProps>();
  });
});
