'use client';

import React, { useState } from 'react';

export default function Page() {
  const [mode, setMode] = useState<'thai' | 'chinese'>('thai');

  const handleEnter = () => {
    localStorage.setItem('midea-learning-mode', mode);
    window.location.href = '/study';
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white gap-6">
      <h1 className="text-3xl font-bold">เลือกโหมดการเรียน</h1>

      <button
        onClick={() => setMode('thai')}
        className={`p-4 rounded ${mode === 'thai' ? 'bg-blue-500' : 'bg-gray-700'}`}
      >
        ไทย → จีน
      </button>

      <button
        onClick={() => setMode('chinese')}
        className={`p-4 rounded ${mode === 'chinese' ? 'bg-blue-500' : 'bg-gray-700'}`}
      >
        จีน → ไทย
      </button>

      <button onClick={handleEnter}
        className="bg-green-500 px-6 py-3 rounded">
        เริ่มเรียน
      </button>
    </div>
  );
}