'use client';

import React, { useState } from 'react';

export default function Page() {
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');

  const handleSubmit = () => {
    if (!employeeId || !name || !department) {
      alert('กรอกข้อมูลให้ครบ');
      return;
    }

    localStorage.setItem('midea-player-name', name);
    localStorage.setItem('midea-employee-code', employeeId);
    localStorage.setItem('midea-department', department);

    window.location.href = '/learn';
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white gap-4">
      <h1 className="text-3xl font-bold">Midea Language Platform</h1>

      <input placeholder="Employee ID"
        className="p-3 rounded bg-gray-800"
        onChange={(e) => setEmployeeId(e.target.value)} />

      <input placeholder="Name"
        className="p-3 rounded bg-gray-800"
        onChange={(e) => setName(e.target.value)} />

      <input placeholder="Department"
        className="p-3 rounded bg-gray-800"
        onChange={(e) => setDepartment(e.target.value)} />

      <button onClick={handleSubmit}
        className="bg-blue-500 px-6 py-3 rounded">
        Enter
      </button>
    </div>
  );
}