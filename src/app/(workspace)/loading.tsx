import React from "react";

export default function WorkspaceLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top route transition bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2855D9] via-indigo-500 to-sky-400 z-50 shadow-sm" />

      {/* Breadcrumb skeleton */}
      <div className="flex items-center space-x-2">
        <div className="w-16 h-3.5 bg-[#E4E8F0] rounded" />
        <div className="w-3 h-3 bg-[#E4E8F0] rounded-full" />
        <div className="w-24 h-3.5 bg-[#E4E8F0] rounded" />
      </div>

      {/* Header skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E4E8F0] pb-5">
        <div className="space-y-2">
          <div className="w-48 sm:w-64 h-7 bg-[#E4E8F0] rounded-lg" />
          <div className="w-64 sm:w-96 h-3.5 bg-[#E4E8F0]/70 rounded" />
        </div>
        <div className="w-32 h-9 bg-[#E4E8F0] rounded-lg" />
      </div>

      {/* Metrics / Filter row skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-white border border-[#E4E8F0] rounded-xl p-3 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#E4E8F0] shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="w-20 h-3 bg-[#E4E8F0] rounded" />
              <div className="w-12 h-2.5 bg-[#E4E8F0]/70 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Content grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white border border-[#E4E8F0] rounded-xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="w-20 h-5 bg-[#EDF2FF] rounded" />
              <div className="w-12 h-4 bg-[#F4F6FA] rounded" />
            </div>
            <div className="space-y-2">
              <div className="w-3/4 h-4 bg-[#E4E8F0] rounded" />
              <div className="w-full h-3 bg-[#E4E8F0]/70 rounded" />
              <div className="w-2/3 h-3 bg-[#E4E8F0]/70 rounded" />
            </div>
            <div className="pt-3 border-t border-[#E4E8F0] flex items-center justify-between">
              <div className="w-16 h-3 bg-[#E4E8F0] rounded" />
              <div className="w-20 h-7 bg-[#E4E8F0] rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
