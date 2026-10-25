import type ApexCharts from "apexcharts";
import { createEffect, on, onCleanup, onMount } from "solid-js";

const sparklineOptions = (color: string) => ({
  chart: {
    type: "area" as const,
    height: "100%",
    width: "100%",
    toolbar: { show: false },
    sparkline: { enabled: true },
    animations: { enabled: false },
  },
  colors: [color],
  stroke: {
    curve: "smooth" as const,
    width: 2,
  },
  fill: {
    type: "gradient",
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.4,
      opacityTo: 0,
      stops: [0, 100],
    },
  },
  tooltip: {
    fixed: { enabled: false },
    x: { show: false },
    y: {
      title: {
        formatter: () => "",
      },
    },
    marker: { show: false },
  },
});

/**
 * Live-updating area sparkline. apexcharts is loaded lazily and renders asynchronously, so every
 * call is guarded: data that changes before the first render finishes is applied once it does,
 * and unmounting mid-load skips or destroys the chart instead of throwing.
 */
export function AreaSparkline(props: { color: string; data: number[] }) {
  let el!: HTMLDivElement;
  let chart: ApexCharts | undefined;
  let ready = false;
  let disposed = false;

  onMount(async () => {
    const { default: ApexChartsCtor } = await import("apexcharts");
    if (disposed) return;
    chart = new ApexChartsCtor(el, {
      ...sparklineOptions(props.color),
      series: [{ data: props.data }],
    });
    try {
      await chart.render();
    } catch (error) {
      // Destroying a chart mid-render rejects the render promise; that's expected on unmount.
      if (!disposed) throw error;
      return;
    }
    if (disposed) return;
    ready = true;
    chart.updateSeries([{ data: props.data }]);
  });

  createEffect(
    on(
      () => props.data,
      (data) => {
        if (ready) chart?.updateSeries([{ data }]);
      },
      { defer: true },
    ),
  );

  onCleanup(() => {
    disposed = true;
    chart?.destroy();
    chart = undefined;
  });

  return <div ref={el} class="h-full w-full" />;
}
