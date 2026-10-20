<script setup lang="ts">
import UButton from "@nuxt/ui/components/Button.vue";
import UFormField from "@nuxt/ui/components/FormField.vue";
import UInput from "@nuxt/ui/components/Input.vue";
import Attribution from "ol/control/Attribution.js";
import { defaults as defaultInteractions } from "ol/interaction/defaults.js";
import PointerInteraction from "ol/interaction/Pointer.js";
import TileLayer from "ol/layer/Tile.js";
import Map from "ol/Map.js";
import Overlay from "ol/Overlay.js";
import { fromLonLat, toLonLat } from "ol/proj.js";
import OSM from "ol/source/OSM.js";
import View from "ol/View.js";
import * as v from "valibot";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import type { QrContentDraft } from "../../editor/content.js";
import { qrContentSchemas } from "../../editor/validation.js";
import {
  searchQrLocations,
  type QrLocationSearch,
  type QrLocationSearchResult,
} from "../geocoding.js";
import type { QrEditorMessages } from "../messages.js";

const props = defineProps<{
  draft: QrContentDraft;
  messages: QrEditorMessages;
  locationSearch?: QrLocationSearch;
  showSearch: boolean;
}>();
const emit = defineEmits<{ select: [value: { latitude: string; longitude: string }] }>();
const container = ref<HTMLDivElement>();
const pin = ref<HTMLButtonElement>();
const tilesUnavailable = ref(false);
const ready = ref(false);
const searchText = ref("");
const searchStatus = ref<"idle" | "loading" | "empty" | "failed">("idle");
const searchInvalid = ref(false);
const results = ref<readonly QrLocationSearchResult[]>([]);
const QuerySchema = v.pipe(v.string(), v.trim(), v.minLength(2), v.maxLength(200));
let searchController: AbortController | undefined;
let searchSequence = 0;
watch(searchText, () => {
  searchSequence++;
  searchController?.abort();
  results.value = [];
  searchStatus.value = "idle";
  searchInvalid.value = false;
});
async function searchLocations() {
  const query = v.safeParse(QuerySchema, searchText.value);
  searchInvalid.value = !query.success;
  if (!query.success) return;
  const current = ++searchSequence;
  searchController?.abort();
  searchController = new AbortController();
  searchStatus.value = "loading";
  results.value = [];
  try {
    const found = await (props.locationSearch ?? searchQrLocations)(query.output, {
      signal: searchController.signal,
    });
    if (current !== searchSequence) return;
    results.value = found;
    searchStatus.value = found.length ? "idle" : "empty";
  } catch {
    if (current === searchSequence) searchStatus.value = "failed";
  }
}
function selectResult(result: QrLocationSearchResult) {
  select(fromLonLat([result.longitude, result.latitude]));
  map?.getView().setZoom(14);
  results.value = [];
  searchStatus.value = "idle";
}
const point = computed(() => {
  const result = v.safeParse(qrContentSchemas.location, props.draft);
  if (!result.success) return undefined;
  return fromLonLat([result.output.longitude, result.output.latitude]);
});
let map: Map | undefined;
let marker: Overlay | undefined;
let source: OSM | undefined;
let dragging = false;
function select(coordinate: number[]) {
  const [longitude, latitude] = toLonLat(coordinate) as [number, number];
  emit("select", {
    latitude: Math.max(-90, Math.min(90, latitude)).toFixed(6),
    longitude: longitude.toFixed(6),
  });
}
function syncPoint() {
  marker?.setPosition(point.value);
  if (point.value && !dragging) map?.getView().setCenter(point.value);
}
watch(point, syncPoint);
onMounted(() => {
  if (!container.value || !pin.value) return;
  source = new OSM({ referrerPolicy: "strict-origin-when-cross-origin" });
  source.on("tileloaderror", () => {
    tilesUnavailable.value = true;
  });
  source.on("tileloadend", () => {
    tilesUnavailable.value = false;
  });
  marker = new Overlay({ element: pin.value, positioning: "bottom-center", stopEvent: false });
  map = new Map({
    target: container.value,
    wheelListenerPassive: true,
    layers: [new TileLayer({ source, preload: 0 })],
    controls: [new Attribution({ collapsible: false })],
    interactions: defaultInteractions({
      mouseWheelZoom: false,
      altShiftDragRotate: false,
      pinchRotate: false,
    }),
    overlays: [marker],
    view: new View({
      center: point.value ?? fromLonLat([37.6173, 55.7558]),
      zoom: 12,
      minZoom: 1,
      maxZoom: 19,
    }),
  });
  map.addInteraction(
    new PointerInteraction({
      handleDownEvent(event) {
        const target = event.originalEvent.target;
        dragging = target instanceof Node && !!pin.value?.contains(target);
        return dragging;
      },
      handleDragEvent(event) {
        marker?.setPosition(event.coordinate);
      },
      handleUpEvent(event) {
        dragging = false;
        select(event.coordinate);
        return false;
      },
    }),
  );
  map.on("singleclick", (event) => {
    const target = event.originalEvent.target;
    if (target instanceof Node && pin.value?.contains(target)) return;
    select(event.coordinate);
  });
  syncPoint();
  ready.value = true;
});
onBeforeUnmount(() => {
  searchSequence++;
  searchController?.abort();
  map?.dispose();
});
function zoom(delta: number) {
  const view = map?.getView();
  if (view) view.setZoom((view.getZoom() ?? 12) + delta);
}
function selectCenter() {
  const center = map?.getView().getCenter();
  if (center) select(center);
}
function retry() {
  tilesUnavailable.value = false;
  source?.refresh();
}
</script>

<template>
  <div class="space-y-2">
    <form v-if="showSearch" class="space-y-2" @submit.prevent="searchLocations">
      <UFormField
        :label="messages.mapSearch"
        :error="searchInvalid ? messages.mapSearchInvalid : undefined"
        name="locationSearch"
      >
        <div class="flex gap-2">
          <UInput
            v-model="searchText"
            :aria-label="messages.mapSearch"
            :placeholder="messages.mapSearchPlaceholder"
            :maxlength="200"
            autocomplete="off"
            class="min-w-0 flex-1"
          />
          <UButton
            type="submit"
            :label="messages.mapSearchButton"
            :loading="searchStatus === 'loading'"
            :disabled="searchStatus === 'loading'"
          />
        </div>
      </UFormField>
      <ul
        v-if="results.length"
        :aria-label="messages.mapSearchResults"
        class="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-default p-1"
      >
        <li v-for="result in results" :key="result.id">
          <UButton
            :label="result.label"
            color="neutral"
            variant="ghost"
            class="w-full justify-start"
            :ui="{ label: 'whitespace-normal text-left' }"
            @click="selectResult(result)"
          />
        </li>
      </ul>
      <p
        v-if="searchStatus === 'empty' || searchStatus === 'failed'"
        role="status"
        class="text-xs text-muted"
      >
        {{ searchStatus === "empty" ? messages.mapSearchEmpty : messages.mapSearchFailed }}
      </p>
    </form>
    <div class="relative isolate overflow-hidden rounded-lg border border-default bg-elevated">
      <div
        ref="container"
        :aria-label="messages.mapLabel"
        role="region"
        tabindex="0"
        class="h-64 w-full outline-primary focus-visible:outline-2 sm:h-72"
      />
      <button ref="pin" type="button" :aria-label="messages.mapMarker" class="qr-location-marker" />
      <div v-if="ready" class="absolute top-3 right-3 z-10 flex flex-col gap-1">
        <UButton
          :aria-label="messages.mapZoomIn"
          color="neutral"
          variant="solid"
          label="+"
          @click="zoom(1)"
        />
        <UButton
          :aria-label="messages.mapZoomOut"
          color="neutral"
          variant="solid"
          label="−"
          @click="zoom(-1)"
        />
      </div>
    </div>
    <div
      v-if="tilesUnavailable"
      class="flex items-center justify-between gap-2 text-xs text-muted"
      role="status"
    >
      <p>{{ messages.mapUnavailable }}</p>
      <UButton :label="messages.mapRetry" color="neutral" variant="soft" size="xs" @click="retry" />
    </div>
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-xs text-muted">{{ messages.mapHint }}</p>
      <UButton
        v-if="ready"
        :label="messages.mapSelectCenter"
        color="neutral"
        variant="soft"
        size="xs"
        @click="selectCenter"
      />
    </div>
  </div>
</template>

<style src="ol/ol.css"></style>

<style scoped>
.qr-location-marker {
  display: block;
  width: 24px;
  height: 24px;
  border: 3px solid white;
  border-radius: 50% 50% 50% 0;
  background: var(--ui-primary);
  box-shadow: 0 2px 6px #0005;
  transform: translateY(-5px) rotate(-45deg);
  cursor: grab;
}
.qr-location-marker:active {
  cursor: grabbing;
}
.qr-location-marker:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 3px;
}
</style>
