import { CartesianGrid, Legend, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import type { ClusterRecord } from '../types/index';

type Props = {
  clusters: ClusterRecord[];
};

function ClusterScatterPlot({ clusters }: Props) {
  const data = clusters.map((cluster) => ({
    cluster_id: cluster.cluster_id,
    x: cluster.centroid.density ?? cluster.centroid.thermal_conductivity ?? 0,
    y: cluster.centroid.melting_point ?? cluster.centroid.decomposition_temp ?? 0,
    material_count: cluster.material_count,
  }));

  return (
    <div className="dravix-card rounded-[1.75rem] p-4">
      <div className="mb-4 text-lg font-light text-[var(--dravix-ink)]">Cluster scatter</div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(118,33,35,0.08)" />
            <XAxis dataKey="x" name="Density" tick={{ fill: '#762123', fontSize: 12 }} />
            <YAxis dataKey="y" name="Melting point" tick={{ fill: '#762123', fontSize: 12 }} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter data={data} fill="#E8967F" name="Clusters" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ClusterScatterPlot;
