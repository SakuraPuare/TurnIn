"use client";

import { useState, useRef } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { post } from '@/lib/api';

// Schema for student validation
const studentSchema = z.object({
  studentId: z.string().min(1, "学号不能为空"),
  name: z.string().min(1, "姓名不能为空"),
  email: z.string().email("邮箱格式不正确").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
});

type StudentData = z.infer<typeof studentSchema>;

interface BatchStudentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  classId: string;
}

export function BatchStudentForm({
  open,
  onOpenChange,
  onSuccess,
  classId,
}: BatchStudentFormProps) {
  const [activeTab, setActiveTab] = useState("paste");
  const [pasteContent, setPasteContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parsedStudents, setParsedStudents] = useState<StudentData[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isParsed, setIsParsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setPasteContent("");
    setParsedStudents([]);
    setParseErrors([]);
    setIsParsed(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    resetForm();
  };

  const parseCSVContent = (content: string): { students: StudentData[], errors: string[] } => {
    const lines = content.trim().split(/\r?\n/);
    const students: StudentData[] = [];
    const errors: string[] = [];

    lines.forEach((line, index) => {
      // Skip empty lines
      if (!line.trim()) return;

      // Split by comma or tab
      const parts = line.split(/[,\t]+/);
      
      if (parts.length < 2) {
        errors.push(`第 ${index + 1} 行: 格式错误，至少需要学号和姓名`);
        return;
      }

      const studentData: StudentData = {
        studentId: parts[0].trim(),
        name: parts[1].trim(),
        email: parts.length > 2 ? parts[2].trim() : "",
        phone: parts.length > 3 ? parts[3].trim() : "",
      };

      try {
        studentSchema.parse(studentData);
        students.push(studentData);
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach(err => {
            errors.push(`第 ${index + 1} 行: ${err.message}`);
          });
        } else {
          errors.push(`第 ${index + 1} 行: 数据验证失败`);
        }
      }
    });

    return { students, errors };
  };

  const handleParse = () => {
    if (!pasteContent.trim()) {
      toast.error("请输入学生数据");
      return;
    }

    const { students, errors } = parseCSVContent(pasteContent);
    setParsedStudents(students);
    setParseErrors(errors);
    setIsParsed(true);

    if (students.length === 0) {
      toast.error("未能解析出有效的学生数据");
    } else {
      toast.success(`成功解析 ${students.length} 名学生数据${errors.length > 0 ? '，但存在一些错误' : ''}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error("请上传CSV文件");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setPasteContent(content);
      const { students, errors } = parseCSVContent(content);
      setParsedStudents(students);
      setParseErrors(errors);
      setIsParsed(true);

      if (students.length === 0) {
        toast.error("未能解析出有效的学生数据");
      } else {
        toast.success(`成功解析 ${students.length} 名学生数据${errors.length > 0 ? '，但存在一些错误' : ''}`);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (parsedStudents.length === 0) {
      toast.error("没有可添加的学生数据");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await post(`/classes/${classId}/students/batch`, {
        students: parsedStudents
      });

      toast.success(`成功添加 ${result.added} 名学生${result.duplicates > 0 ? `，${result.duplicates} 名学生已存在` : ''}`);
      
      // Close the dialog and refresh the data
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("批量添加学生失败，请重试");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        resetForm();
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>批量添加学生</DialogTitle>
          <DialogDescription>
            通过CSV文件或直接粘贴批量添加学生到班级
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="paste">粘贴数据</TabsTrigger>
            <TabsTrigger value="upload">上传CSV</TabsTrigger>
          </TabsList>
          
          <TabsContent value="paste" className="mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="pasteContent">粘贴学生数据（格式：学号,姓名,邮箱,电话）</Label>
                <Textarea
                  id="pasteContent"
                  placeholder="例如：
2023001,张三,zhangsan@example.com,13800000001
2023002,李四,lisi@example.com,13800000002"
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  className="h-[200px] mt-2 font-mono"
                />
              </div>
              {!isParsed && (
                <Button type="button" onClick={handleParse} className="w-full">
                  解析数据
                </Button>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="upload" className="mt-4">
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-md p-6 text-center">
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">上传CSV文件</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  CSV文件格式：学号,姓名,邮箱,电话
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  选择CSV文件
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {isParsed && (
          <div className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">解析结果</h3>
              <Button variant="outline" size="sm" onClick={resetForm}>
                重置
              </Button>
            </div>
            
            <div className="text-sm">
              共解析出 <span className="font-medium">{parsedStudents.length}</span> 名学生
              {parseErrors.length > 0 && (
                <span className="text-destructive"> 和 {parseErrors.length} 个错误</span>
              )}
            </div>
            
            {parseErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>解析错误</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {parseErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            {parsedStudents.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <div className="max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>学号</TableHead>
                        <TableHead>姓名</TableHead>
                        <TableHead>邮箱</TableHead>
                        <TableHead>电话</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedStudents.map((student, index) => (
                        <TableRow key={index}>
                          <TableCell>{student.studentId}</TableCell>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>{student.email || "-"}</TableCell>
                          <TableCell>{student.phone || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
        
        <DialogFooter className="mt-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            取消
          </Button>
          {isParsed && parsedStudents.length > 0 && (
            <Button 
              type="button" 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "添加中..." : `添加 ${parsedStudents.length} 名学生`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 