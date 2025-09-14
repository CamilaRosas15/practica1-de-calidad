"use client";

import { Card, CardBody, CardHeader } from "@heroui/react";

import { AdminReportTable } from "./AdminReportTable";

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
        </CardHeader>
        <CardBody>
          <AdminReportTable />
        </CardBody>
      </Card>
    </div>
  );
}
