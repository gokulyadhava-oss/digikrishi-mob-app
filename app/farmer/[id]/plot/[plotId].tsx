import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

/** Redirects to the (tabs) plot map screen so one plot screen uses Google Maps + backend. */
export default function FarmerPlotRedirect() {
  const { id: _farmerId, plotId, plotTitle, plotMeta } = useLocalSearchParams<{
    id: string;
    plotId: string;
    plotTitle?: string;
    plotMeta?: string;
  }>();
  const router = useRouter();

  useEffect(() => {
    if (plotId) {
      router.replace({ pathname: '/plot/[id]', params: { id: plotId, farmerId: _farmerId as string, plotTitle, plotMeta } });
    } else {
      router.back();
    }
  }, [plotId, _farmerId, plotTitle, plotMeta, router]);

  return null;
}
