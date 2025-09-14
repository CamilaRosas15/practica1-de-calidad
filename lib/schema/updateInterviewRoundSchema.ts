import { z } from "zod";
import { parseDate } from "@internationalized/date";

import { APPLICATION_STATUS } from "@/lib/constants/applicationStatus";

export const INTERVIEW_TAGS = ["Online Assessment", "HR/Recruiter", "Technical", "Behavioral", "Hiring Manager", "Final Round"] as const satisfies readonly InterviewTag[];

// Question number constants
export const DEFAULT_QUESTION_NUMBER = 1; // Default valid question number when adding new question

const MAX_LEETCODE_QUESTION_NUMBER = parseInt(process.env.NEXT_PUBLIC_MAX_LEETCODE_QUESTION_NUMBER ?? "3000", 10);

// Add new LeetCode question schema
const leetCodeQuestionSchema = z.object({
  question_number: z
    .number()
    .int("Question number must be a whole number")
    .min(1, "Question number must be positive")
    .max(MAX_LEETCODE_QUESTION_NUMBER, `Question number must be less than ${MAX_LEETCODE_QUESTION_NUMBER}`)
    .nullable()
    .superRefine((val, ctx) => {
      if (val === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Question number is required",
        });
      }
    }),
});

// Single interview round schema
export const interviewRoundSchema = z.object({
  description: z.string().min(1, "Description is required"),
  interview_date: z.string().min(1, "Interview date is required"),
  response_date: z.string().nullable(),
  interview_tags: z.array(z.enum(INTERVIEW_TAGS)).nullable(),
  leetcode_questions: z
    .array(leetCodeQuestionSchema)
    .nullable()
    .superRefine((questions, ctx) => {
      if (!questions || questions.length === 0) return;

      // Track seen numbers and their indices
      const seen = new Map<number, number>();

      questions.forEach((question, index) => {
        const num = question.question_number;

        if (num === null) return;

        if (seen.has(num)) {
          // Add error to the duplicate question
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Question number ${num} is already used in this round`,
            path: [index, "question_number"], // This will target the specific input, use [] for whole array
          });
        } else {
          seen.set(num, index);
        }
      });
    }),
});

export type InterviewRoundSchema = z.infer<typeof interviewRoundSchema>;

// Update interview experience form schema
export const UpdateInterviewExperienceFormSchema = z
  .object({
    applied_date: z.string().min(1, "Applied date is required"),
    first_response_date: z.string().nullable(),
    status: z.nativeEnum(APPLICATION_STATUS),
    interviewRounds: z.array(interviewRoundSchema),
  })
  .superRefine((data, ctx) => {
    const { applied_date, first_response_date, interviewRounds } = data;

    // If first_response_date is not set, skip further date validations
    if (!first_response_date) {
      return;
    }

    // Safe to parse dates now as they are not empty
    const appliedDate = parseDate(applied_date);
    const firstResponseDate = parseDate(first_response_date);

    // Check if applied_date is before first_response_date
    if (firstResponseDate.compare(appliedDate) < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "First response date must be after the applied date",
        path: ["first_response_date"],
      });
    }

    if (!interviewRounds || interviewRounds.length === 0) {
      return;
    }

    interviewRounds.forEach((round, index) => {
      const { interview_date, response_date } = round;

      const interviewDate = parseDate(interview_date);

      // Check if interview_date is after previous response_date or first_response_date
      if (index === 0) {
        if (interviewDate.compare(firstResponseDate) < 0) {
          ctx.addIssue({
            path: ["interviewRounds", index, "interview_date"],
            message: "Interview date must be after the first response date",
            code: z.ZodIssueCode.custom,
          });
        }
      } else {
        const previousRound = interviewRounds[index - 1];
        const previousResponseDate = previousRound.response_date ? parseDate(previousRound.response_date) : null;

        if (previousResponseDate && interviewDate.compare(previousResponseDate) < 0) {
          ctx.addIssue({
            path: ["interviewRounds", index, "interview_date"],
            message: "Interview date must be after the previous round's response date",
            code: z.ZodIssueCode.custom,
          });
        }
      }

      // Check if response_date is after interview_date
      if (response_date) {
        const respDate = parseDate(response_date);

        if (respDate.compare(interviewDate) < 0) {
          ctx.addIssue({
            path: ["interviewRounds", index, "response_date"],
            message: "Response date must be after the interview date",
            code: z.ZodIssueCode.custom,
          });
        }
      }
    });
  });

export type InterviewExperienceFormValues = z.infer<typeof UpdateInterviewExperienceFormSchema>;

export const INTERVIEW_FORM_ID = "interview-form";
