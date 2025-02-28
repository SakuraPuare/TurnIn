"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClassForm } from "@/components/ClassForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Plus, Pencil, Trash2, Users, ChevronRight } from "lucide-react";
import { get } from '@/lib/api';

interface Class {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    students: number;
  };
}

export default function ClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | undefined>(undefined);
  
  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<Class | undefined>(undefined);

  // Fetch classes
  const fetchClasses = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await get('/classes');
      setClasses(data);
    } catch (error) {
      console.error("Error fetching classes:", error);
      setError(error instanceof Error ? error.message : "获取班级列表失败");
      toast.error("获取班级列表失败");
    } finally {
      setLoading(false);
    }
  };

  // Load classes on component mount
  useEffect(() => {
    fetchClasses();
  }, []);

  // Handle edit class
  const handleEditClass = (classData: Class) => {
    setSelectedClass(classData);
    setFormOpen(true);
  };

  // Handle delete class
  const handleDeleteClass = (classData: Class) => {
    setClassToDelete(classData);
    setDeleteDialogOpen(true);
  };

  // Handle add new class
  const handleAddClass = () => {
    setSelectedClass(undefined);
    setFormOpen(true);
  };

  // Handle view class details
  const handleViewClass = (classId: string) => {
    router.push(`/admin/classes/${classId}`);
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">班级管理</h1>
        <Button onClick={handleAddClass}>
          <Plus className="mr-2 h-4 w-4" />
          添加班级
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p>加载中...</p>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-red-500">{error}</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-64 border rounded-lg p-6 bg-muted/50">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">暂无班级</h3>
          <p className="text-muted-foreground mb-4">
            您还没有创建任何班级，点击"添加班级"按钮创建第一个班级。
          </p>
          <Button onClick={handleAddClass}>
            <Plus className="mr-2 h-4 w-4" />
            添加班级
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>班级名称</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>学生数量</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((classItem) => (
                <TableRow 
                  key={classItem.id} 
                  className="cursor-pointer"
                  onClick={() => handleViewClass(classItem.id)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      {classItem.name}
                      <ChevronRight className="h-4 w-4 ml-1 text-muted-foreground" />
                    </div>
                  </TableCell>
                  <TableCell>{classItem.description || "-"}</TableCell>
                  <TableCell>{classItem._count?.students || 0}</TableCell>
                  <TableCell>
                    {new Date(classItem.createdAt).toLocaleDateString("zh-CN")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClass(classItem);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">编辑</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClass(classItem);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">删除</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Class Form Dialog */}
      <ClassForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchClasses}
        initialData={selectedClass}
      />

      {/* Delete Confirmation Dialog */}
      {classToDelete && (
        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onSuccess={fetchClasses}
          title="删除班级"
          description={`确定要删除班级 "${classToDelete.name}" 吗？此操作将同时删除该班级下的所有学生数据，且不可恢复。`}
          itemId={classToDelete.id}
          apiEndpoint="/api/admin/classes"
        />
      )}

      {/* Toast Container */}
      <Toaster position="top-right" />
    </>
  );
}
