// ขั้นที่ 11 — ฟอร์มเพิ่ม / แก้วิชา (ADMIN)
// ตรวจฟอร์มด้วย validateCourseForm() ก่อน ไม่ผ่าน → ไม่ส่ง request
// ผ่าน → addCourse() (POST) หรือ updateCourse() (PUT) → Backend (ขั้นที่ 12–17)
import { Fragment, useState } from "react";
import { Pencil, PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  emptyCourseForm,
  validateCourseField,
  validateCourseForm,
  type CourseFormErrors,
  type CourseFormValues,
} from "@/lib/course-validation";
import { useEnrollmentStore } from "@/lib/enrollment-store";
import type { Course } from "@/lib/types";

export function CourseFormDialog({ course }: { course?: Course }) {
  const isEdit = course !== undefined;
  // ขั้นที่ 11 — <CourseFormDialog /> → โหมดเพิ่ม (POST), <CourseFormDialog course={course} /> → โหมดแก้ไข (PUT)
  const addCourse = useEnrollmentStore((s) => s.addCourse);
  const updateCourse = useEnrollmentStore((s) => s.updateCourse);
  const allCourses = useEnrollmentStore((s) => s.courses);

  const courses = isEdit
    ? allCourses.filter((c) => c.courseId !== course.courseId)
    : allCourses;
  const initialValues: CourseFormValues = isEdit
    ? {
        courseId: course.courseId,
        courseTitle: course.courseTitle,
        instructors: course.instructors,
      }
    : emptyCourseForm;
  const [open, setOpen] = useState(false);

  // state ที่ต้องถือเองสามก้อน (Zod + React Hook Form จะรวมเป็น useForm ตัวเดียว)
  const [values, setValues] = useState<CourseFormValues>(initialValues);
  const [errors, setErrors] = useState<CourseFormErrors>({});
  const [touched, setTouched] = useState<
    Partial<Record<keyof CourseFormValues, boolean>>
  >({});

  const [instructorInput, setInstructorInput] = useState("");

  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const instructorsAnchor = useComboboxAnchor();

  const knownInstructors = [
    ...new Set(allCourses.flatMap((c) => c.instructors)),
  ];
  const typedInstructor = instructorInput.trim();
  const isNewInstructor =
    typedInstructor.length > 0 &&
    !knownInstructors.some(
      (name) => name.toLowerCase() === typedInstructor.toLowerCase(),
    ) &&
    !values.instructors.includes(typedInstructor);
  const instructorItems = [
    ...knownInstructors,
    ...values.instructors.filter((name) => !knownInstructors.includes(name)),
    ...(isNewInstructor ? [typedInstructor] : []),
  ];

  const checkField = (name: keyof CourseFormValues, next: CourseFormValues) => {
    setErrors((prev) => ({
      ...prev,
      [name]: validateCourseField(name, next, courses),
    }));
  };

  const handleChange = <K extends keyof CourseFormValues>(
    name: K,
    value: CourseFormValues[K],
  ) => {
    const next = { ...values, [name]: value };
    setValues(next);

    if (touched[name]) checkField(name, next);
  };

  const handleBlur = (name: keyof CourseFormValues) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    checkField(name, values);
  };

  const resetForm = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setInstructorInput("");
    setServerError(null);
  };

  // ขั้นที่ 11 — กดบันทึก
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextErrors = validateCourseForm(values, courses);
    setErrors(nextErrors);
    setTouched({ courseId: true, courseTitle: true, instructors: true });
    if (Object.keys(nextErrors).length > 0) return; // ไม่ผ่าน → ไม่เรียก addCourse

    // ส่งไป Backend (POST หรือ PUT /api/v3/courses) — Backend ตรวจซ้ำ
    // รวมถึงกันชื่อวิชาซ้ำ ซึ่งฟอร์มฝั่งนี้ไม่ได้ตรวจ
    setSubmitting(true);
    setServerError(null);
    try {
      const payload = {
        courseId: values.courseId.trim(),
        courseTitle: values.courseTitle.trim(),
        instructors: values.instructors,
      };
      if (isEdit) await updateCourse(payload); // PUT
      else await addCourse(payload); // POST
      resetForm();
      setOpen(false); // สำเร็จ → ปิด popup
    } catch (err) {
      setServerError((err as Error).message); // Backend ปฏิเสธ → แสดงในฟอร์ม (serverError — ขั้นที่ 20)
    } finally {
      setSubmitting(false);
    }
  };

  const errorOf = (name: keyof CourseFormValues) =>
    touched[name] ? errors[name] : undefined;

  const invalidProps = (name: keyof CourseFormValues) => ({
    "aria-invalid": errorOf(name) ? true : undefined,
    "aria-describedby": errorOf(name) ? `${name}-error` : undefined,
  });

  const fieldError = (name: keyof CourseFormValues) => {
    const message = errorOf(name);
    return message ? (
      <p id={`${name}-error`} className="text-sm text-destructive">
        {message}
      </p>
    ) : null;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        resetForm();
      }}
    >
      {isEdit ? (
        <DialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label={`แก้ไขวิชา ${course.courseId}`}
            />
          }
        >
          <Pencil className="h-4 w-4" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button />}>
          <PlusCircle className="h-4 w-4" />
          เพิ่มวิชา
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={handleSubmit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? `แก้ไขวิชา ${course.courseId}` : "เพิ่มวิชาใหม่"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "แก้ชื่อวิชาหรือผู้สอนได้ — รหัสวิชาแก้ไม่ได้"
                : "วิชาที่เพิ่มจะไปโผล่เป็นตัวเลือกตอนลงทะเบียนให้นักศึกษาได้ทันที"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-1.5">
            <Label htmlFor="courseId">รหัสวิชา</Label>
            <Input
              id="courseId"
              placeholder="เช่น 261305"
              inputMode="numeric"
              disabled={isEdit}
              value={values.courseId}
              onChange={(e) => handleChange("courseId", e.target.value)}
              onBlur={() => handleBlur("courseId")}
              {...invalidProps("courseId")}
            />
            {fieldError("courseId")}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="courseTitle">ชื่อวิชา</Label>
            <Input
              id="courseTitle"
              placeholder="เช่น Mobile Application Development"
              value={values.courseTitle}
              onChange={(e) => handleChange("courseTitle", e.target.value)}
              onBlur={() => handleBlur("courseTitle")}
              {...invalidProps("courseTitle")}
            />
            {fieldError("courseTitle")}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="instructors">ผู้สอน</Label>
            <Combobox
              multiple
              autoHighlight
              items={instructorItems}
              value={values.instructors}
              onValueChange={(v) => {
                handleChange("instructors", v as string[]);
                setInstructorInput("");
              }}
              inputValue={instructorInput}
              onInputValueChange={setInstructorInput}
            >
              <ComboboxChips ref={instructorsAnchor} className="w-full">
                <ComboboxValue>
                  {(selected: string[]) => (
                    <Fragment>
                      {selected.map((name) => (
                        <ComboboxChip key={name}>{name}</ComboboxChip>
                      ))}
                      <ComboboxChipsInput
                        id="instructors"
                        placeholder={
                          selected.length === 0
                            ? "เลือกหรือพิมพ์ชื่อผู้สอน (ได้หลายคน)"
                            : ""
                        }
                        onBlur={() => handleBlur("instructors")}
                        {...invalidProps("instructors")}
                      />
                    </Fragment>
                  )}
                </ComboboxValue>
              </ComboboxChips>
              <ComboboxContent anchor={instructorsAnchor}>
                <ComboboxEmpty>พิมพ์ชื่อเพื่อเพิ่มผู้สอนใหม่</ComboboxEmpty>
                <ComboboxList>
                  {(name: string) => (
                    <ComboboxItem key={name} value={name}>
                      {name === typedInstructor && isNewInstructor
                        ? `+ เพิ่มผู้สอน "${name}"`
                        : name}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            {fieldError("instructors")}
          </div>

          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
