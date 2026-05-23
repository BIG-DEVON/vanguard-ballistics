"use client";
import { motion } from "framer-motion";
import { FiringSolution } from "@/lib/firingTable";

interface DataTableProps {
  solutions: FiringSolution[] | null;
  hasCalculated: boolean;
}

export default function DataTable({ solutions, hasCalculated }: DataTableProps) {
  // Initial state before calculation
  if (!hasCalculated) {
    return (
      <div className="w-full h-64 border border-vanguard-border rounded-xl flex items-center justify-center bg-vanguard-surface/50">
        <p className="text-vanguard-muted font-mono text-sm tracking-widest uppercase">
          Awaiting Grid Coordinates
        </p>
      </div>
    );
  }

  // Out of Range Error State
  if (hasCalculated && !solutions) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full h-64 border border-vanguard-warning bg-vanguard-warning/10 rounded-xl flex flex-col items-center justify-center space-y-4"
      >
        <div className="w-12 h-12 rounded-full border-2 border-vanguard-warning flex items-center justify-center text-vanguard-warning">
          !
        </div>
        <p className="text-vanguard-warning font-mono font-bold tracking-widest">
          TARGET OUT OF RANGE
        </p>
        <p className="text-vanguard-muted text-sm text-center px-8">
          The calculated distance exceeds the parameters of the current weapon system firing table.
        </p>
      </motion.div>
    );
  }

  // Active Firing Data Table
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full rounded-xl overflow-hidden border border-vanguard-border bg-vanguard-surface"
    >
      <table className="w-full text-left font-mono text-sm">
        <thead className="bg-vanguard-base border-b border-vanguard-border">
          <tr>
            <th className="px-6 py-4 text-vanguard-muted uppercase tracking-wider font-semibold">Option</th>
            <th className="px-6 py-4 text-vanguard-muted uppercase tracking-wider font-semibold">Elevation (mils)</th>
            <th className="px-6 py-4 text-vanguard-muted uppercase tracking-wider font-semibold">Charge</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-vanguard-border">
          {solutions?.map((sol, index) => (
            <motion.tr 
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`hover:bg-white/5 transition-colors ${
                sol.type === "Main" ? "bg-vanguard-success/10" : ""
              }`}
            >
              <td className="px-6 py-4 flex items-center gap-3">
                {sol.type === "Main" && (
                  <span className="w-2 h-2 rounded-full bg-vanguard-success shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                )}
                <span className={sol.type === "Main" ? "text-vanguard-accent font-bold" : "text-vanguard-muted"}>
                  {sol.type}
                </span>
              </td>
              <td className="px-6 py-4 text-vanguard-accent">{sol.elevation}</td>
              <td className="px-6 py-4 text-vanguard-accent">{sol.charge}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}