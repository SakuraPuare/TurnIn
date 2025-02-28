"use client";

import { useState, useEffect, use } from "react";
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
import { StudentForm } from "@/components/StudentForm";
import { BatchStudentForm } from "@/components/BatchStudentForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { ArrowLeft, Plus, Pencil, Trash2, Users, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { get } from '@/lib/api';

interface Student {
  id: string;
  studentId: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
}

interface Class {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  students: Student[];
  _count?: {
    students: number;
  };
}

export default function ClassDetailPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = use(props.params);
  const router = useRouter();
  const [classData, setClassData] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [studentFormOpen, setStudentFormOpen] = useState(false);
  const [batchStudentFormOpen, setBatchStudentFormOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | undefined>(undefined);

  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteStudentDialogOpen, setDeleteStudentDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | undefined>(undefined);

  // Fetch class data
  const fetchClassData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await get(`/classes/${params.id}`);
      setClassData(data);
    } catch (error) {
      console.error("Error fetching class:", error);
      if (error.response?.status === 404) {
        router.push("/admin/classes");
        toast.error("班级不存在");
        return;
      }
      setError(error instanceof Error ? error.message : "获取班级信息失败");
      toast.error("获取班级信息失败");
    } finally {
      setLoading(false);
    }
  };

  // Load class data on component mount
  useEffect(() => {
    fetchClassData();
  }, [params.id]);

  // Handle edit class
  const handleEditClass = () => {
    if (classData) {
      setFormOpen(true);
    }
  };

  // Handle delete class
  const handleDeleteClass = () => {
    if (classData) {
      setDeleteDialogOpen(true);
    }
  };

  // Handle add student
  const handleAddStudent = () => {
    setSelectedStudent(undefined);
    setStudentFormOpen(true);
  };

  // Handle batch add students
  const handleBatchAddStudents = () => {
    setBatchStudentFormOpen(true);
  };

  // Handle edit student
  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setStudentFormOpen(true);
  };

  // Handle delete student
  const handleDeleteStudent = (student: Student) => {
    setStudentToDelete(student);
    setDeleteStudentDialogOpen(true);
  };

  // Handle back to classes list
  const handleBackToClasses = () => {
    router.push("/admin/classes");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>加载中...</p>
      </div>
    );
  }

  if (error || !classData) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-red-500">{error || "班级不存在"}</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToClasses}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回班级列表
        </Button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{classData.name}</h1>
          {classData.description && (
            <p className="text-muted-foreground mt-1">{classData.description}</p>
          )}
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleEditClass}>
            <Pencil className="h-4 w-4 mr-2" />
            编辑班级
          </Button>
          <Button variant="destructive" onClick={handleDeleteClass}>
            <Trash2 className="h-4 w-4 mr-2" />
            删除班级
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">学生列表</h2>
          <div className="flex space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  添加学生
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleAddStudent}>
                  <Plus className="mr-2 h-4 w-4" />
                  单个添加
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBatchAddStudents}>
                  <Upload className="mr-2 h-4 w-4" />
                  批量添加
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {classData.students.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-64 border rounded-lg p-6 bg-muted/50">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">暂无学生</h3>
            <p className="text-muted-foreground mb-4">
              该班级下还没有学生，您可以添加学生到此班级。
            </p>
            <div className="flex space-x-2">
              <Button onClick={handleAddStudent}>
                <Plus className="mr-2 h-4 w-4" />
                单个添加
              </Button>
              <Button variant="outline" onClick={handleBatchAddStudents}>
                <Upload className="mr-2 h-4 w-4" />
                批量添加
              </Button>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>学号</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>电话</TableHead>
                  <TableHead>添加时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classData.students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.studentId}</TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.email || "-"}</TableCell>
                    <TableCell>{student.phone || "-"}</TableCell>
                    <TableCell>
                      {new Date(student.createdAt).toLocaleDateString("zh-CN")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditStudent(student)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">编辑</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteStudent(student)}
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
      </div>

      {/* Class Form Dialog */}
      <ClassForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={fetchClassData}
        initialData={classData}
      />

      {/* Student Form Dialog */}
      <StudentForm
        open={studentFormOpen}
        onOpenChange={setStudentFormOpen}
        onSuccess={fetchClassData}
        classId={classData.id}
        initialData={selectedStudent}
      />

      {/* Batch Student Form Dialog */}
      <BatchStudentForm
        open={batchStudentFormOpen}
        onOpenChange={setBatchStudentFormOpen}
        onSuccess={fetchClassData}
        classId={classData.id}
      />

      {/* Delete Class Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={() => router.push("/admin/classes")}
        title="删除班级"
        description={`确定要删除班级 "${classData.name}" 吗？此操作将同时删除该班级下的所有学生数据，且不可恢复。`}
        itemId={classData.id}
        apiEndpoint="/api/classes"
      />

      {/* Delete Student Confirmation Dialog */}
      {studentToDelete && (
        <DeleteConfirmDialog
          open={deleteStudentDialogOpen}
          onOpenChange={setDeleteStudentDialogOpen}
          onSuccess={fetchClassData}
          title="删除学生"
          description={`确定要删除学生 "${studentToDelete.name} (${studentToDelete.studentId})" 吗？此操作不可恢复。`}
          itemId={studentToDelete.id}
          apiEndpoint={`/api/classes/${classData.id}/students`}
        />
      )}

      {/* Toast Container */}
      <Toaster position="top-right" />
    </>
  );
} 