import { FormProvider, useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardBody, CardHeader, Divider, DatePicker, Select, SelectItem, Textarea, Input } from "@heroui/react";
import { parseDate, today, getLocalTimeZone } from "@internationalized/date";
import { useState } from "react";
import { toast } from "sonner";
import mixpanel from "mixpanel-browser";

import { InterviewTagsModal, utilSortInterviewTags } from "./InterviewTagsModal";

import { DEFAULT_QUESTION_NUMBER, INTERVIEW_FORM_ID, InterviewExperienceFormValues, UpdateInterviewExperienceFormSchema } from "@/lib/schema/updateInterviewRoundSchema";
import { InterviewExperienceCardData } from "@/lib/sharedTypes";
import { APPLICATION_STATUS } from "@/lib/constants/applicationStatus";
import { GetApplicationByIdResponse } from "@/app/api/application/[application_id]/route";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { CustomChip } from "@/components/CustomChip";
import { CustomButton } from "@/components/CustomButton";
import { EmptyContent } from "@/components/EmptyContent";

type EditInterviewDetailsProps = {
  applicationDetails: GetApplicationByIdResponse;
  interviewRounds: InterviewExperienceCardData[];
  onSave: (data: InterviewExperienceFormValues) => Promise<void>;
};

export function EditInterviewDetails({ applicationDetails, interviewRounds, onSave }: EditInterviewDetailsProps) {
  const [openModalIndex, setOpenModalIndex] = useState<number | null>(null);

  const methods = useForm<InterviewExperienceFormValues>({
    resolver: zodResolver(UpdateInterviewExperienceFormSchema),
    defaultValues: {
      applied_date: applicationDetails.applied_date,
      first_response_date: applicationDetails.first_response_date ?? null,
      status: applicationDetails.status,
      interviewRounds: interviewRounds,
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: methods.control,
    name: "interviewRounds",
  });

  const hasFirstResponseDate = useWatch({
    control: methods.control,
    name: "first_response_date",
  });

  const canAddNewRound = () => {
    const currentInterviewRounds = methods.getValues("interviewRounds");

    if (currentInterviewRounds.length === 0) return true;
    const lastRound = currentInterviewRounds[currentInterviewRounds.length - 1];

    return lastRound && lastRound.response_date !== null;
  };

  const handleAddNewInterviewRoundClick = async () => {
    const isFormValid = await methods.trigger();
    const isNewRoundAllowed = canAddNewRound();

    mixpanel.track("Interview Experience Edit", {
      action: "add_round_attempted",
      application_id: applicationDetails.id,
      current_rounds: fields.length,
      is_form_valid: isFormValid,
      error: methods.formState.errors,
      can_add_round: isNewRoundAllowed,
    });

    if (!isFormValid) {
      toast.error("Please fix the errors in the form before adding a new one.");
    } else {
      if (isNewRoundAllowed) {
        append({
          description: "",
          interview_date: today(getLocalTimeZone()).toString(),
          response_date: null,
          interview_tags: [],
          leetcode_questions: [],
        });
      } else {
        const latestRoundNumber = fields.length;

        toast.error(`Please fill the response date for the latest interview Round ${latestRoundNumber} before adding a new round.`);
      }
    }
  };

  const handleFormSubmit = methods.handleSubmit(onSave, () => {
    // On error callback
    toast.error("Please fix the errors in the form before saving.");
    mixpanel.track("Interview Experience Edit", {
      action: "form_validation_error",
      application_id: applicationDetails.id,
      error: methods.formState.errors,
    });
  });

  // #region mixpanel tracking functions

  const trackStatusChange = (value: string) => {
    mixpanel.track("Interview Experience Edit", {
      action: "status_changed",
      application_id: applicationDetails.id,
      previous_status: methods.getValues("status"),
      new_status: value,
    });
  };

  const trackRoundRemoval = (index: number) => {
    mixpanel.track("Interview Experience Edit", {
      action: "round_removed",
      application_id: applicationDetails.id,
      round_number: index + 1,
      total_rounds: fields.length,
    });
  };

  const trackTagsChange = (index: number, tags: string[]) => {
    mixpanel.track("Interview Experience Edit", {
      action: "tags_updated",
      application_id: applicationDetails.id,
      round_number: index + 1,
      tags_count: tags.length,
      tags: tags,
    });
  };

  const trackLeetcodeQuestionAdd = (roundIndex: number) => {
    mixpanel.track("Interview Experience Edit", {
      action: "leetcode_question_added",
      application_id: applicationDetails.id,
      round_number: roundIndex + 1,
    });
  };

  const trackLeetcodeQuestionRemove = (roundIndex: number, questionIndex: number) => {
    mixpanel.track("Interview Experience Edit", {
      action: "leetcode_question_removed",
      application_id: applicationDetails.id,
      round_number: roundIndex + 1,
      question_index: questionIndex,
    });
  };

  // #endregion

  const getQuestionFieldError = (index: number, qIndex: number) => {
    return methods.formState.errors?.interviewRounds?.[index]?.leetcode_questions?.[qIndex]?.question_number;
  };

  const checkQuestionFieldTouched = (index: number, qIndex: number) => {
    const touched = methods.formState.touchedFields?.interviewRounds?.[index]?.leetcode_questions;

    return Array.isArray(touched) && touched[qIndex]?.question_number;
  };

  return (
    <FormProvider {...methods}>
      <form noValidate id={INTERVIEW_FORM_ID} onSubmit={handleFormSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 flex-shrink-0">
                <ImageWithFallback
                  alt={applicationDetails.job_posting.company.company_name}
                  companyName={applicationDetails.job_posting.company.company_name}
                  src={applicationDetails.job_posting.company.logo_url}
                />
              </div>
              <div>
                <h2 className="text-lg">{applicationDetails.job_posting.title}</h2>
                <p className="text-default-500">{applicationDetails.job_posting.company.company_name}</p>
              </div>
            </div>
          </CardHeader>
          <Divider />
          <CardBody>
            <div className="flex w-full flex-wrap gap-4 md:flex-nowrap">
              <Controller
                control={methods.control}
                name="status"
                render={({ field }) => (
                  <Select
                    label="Application Status"
                    placeholder="Select application status"
                    selectedKeys={[field.value]}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      trackStatusChange(e.target.value);
                    }}
                  >
                    {Object.values(APPLICATION_STATUS).map((value) => (
                      <SelectItem key={value}>{value}</SelectItem>
                    ))}
                  </Select>
                )}
              />

              <Controller
                control={methods.control}
                name="applied_date"
                render={({ field, fieldState }) => (
                  <DatePicker
                    isRequired
                    errorMessage={fieldState.error?.message}
                    isInvalid={!!fieldState.error}
                    label="Applied Date"
                    maxValue={today(getLocalTimeZone())}
                    value={field.value ? parseDate(field.value) : null}
                    onChange={(date) => field.onChange(date ? date.toString() : null)}
                  />
                )}
              />
              <Controller
                control={methods.control}
                name="first_response_date"
                render={({ field, fieldState }) => (
                  <DatePicker
                    isRequired
                    errorMessage={fieldState.error?.message}
                    isInvalid={!!fieldState.error}
                    label="First Response Date"
                    maxValue={today(getLocalTimeZone())}
                    value={field.value ? parseDate(field.value) : null}
                    onChange={(date) => field.onChange(date ? date.toString() : null)}
                  />
                )}
              />
            </div>
          </CardBody>
        </Card>

        {hasFirstResponseDate && (
          <>
            <div className="my-4 flex justify-end">
              <CustomButton type="button" onClick={handleAddNewInterviewRoundClick}>
                Add New Round
              </CustomButton>
            </div>

            {fields.length === 0 && <EmptyContent heading="No interview rounds yet" message="Add a new round to start tracking your interview process" />}

            {fields.map((field, index) => {
              const isLastRound = index === fields.length - 1;

              return (
                <div key={field.id} className="mb-4 rounded-md border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold">Round {index + 1}</p>
                    <CustomButton
                      color="danger"
                      size="sm"
                      type="button"
                      onClick={() => {
                        trackRoundRemoval(index);
                        remove(index);
                      }}
                    >
                      Remove
                    </CustomButton>
                  </div>
                  <Controller
                    control={methods.control}
                    name={`interviewRounds.${index}.description`}
                    render={({ field, fieldState }) => (
                      <Textarea
                        {...field}
                        isRequired
                        className="mt-2"
                        errorMessage={fieldState.error?.message}
                        isInvalid={!!fieldState.error}
                        label="Description"
                        placeholder="Enter interview round description"
                      />
                    )}
                  />
                  <Controller
                    control={methods.control}
                    name={`interviewRounds.${index}.interview_date`}
                    render={({ field, fieldState }) => (
                      <DatePicker
                        isRequired
                        className="mt-2"
                        errorMessage={fieldState.error?.message}
                        isInvalid={!!fieldState.error}
                        label="Interview Date"
                        maxValue={today(getLocalTimeZone())}
                        value={field.value ? parseDate(field.value) : null}
                        onChange={(date) => field.onChange(date ? date.toString() : null)}
                      />
                    )}
                  />
                  <Controller
                    control={methods.control}
                    name={`interviewRounds.${index}.response_date`}
                    render={({ field, fieldState }) => (
                      <DatePicker
                        className="mt-2"
                        errorMessage={fieldState.error?.message}
                        isInvalid={!!fieldState.error}
                        isRequired={!isLastRound}
                        label="Response Date"
                        maxValue={today(getLocalTimeZone())}
                        value={field.value ? parseDate(field.value) : null}
                        onChange={(date) => field.onChange(date ? date.toString() : null)}
                      />
                    )}
                  />

                  <Controller
                    control={methods.control}
                    name={`interviewRounds.${index}.interview_tags`}
                    render={({ field }) => (
                      <>
                        <div className="mt-4 flex justify-end">
                          <CustomButton color="secondary" variant="bordered" onPress={() => setOpenModalIndex(index)}>
                            Select Interview Tags
                          </CustomButton>
                        </div>
                        {field.value && field.value.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {utilSortInterviewTags(field.value).map((tag) => (
                              <CustomChip key={tag} color="secondary" variant="flat">
                                {tag}
                              </CustomChip>
                            ))}
                          </div>
                        )}
                        <InterviewTagsModal
                          isOpen={openModalIndex === index}
                          selectedTags={field.value || []}
                          onClose={() => setOpenModalIndex(null)}
                          onTagsChange={(tags) => {
                            field.onChange(tags);
                            setOpenModalIndex(null);
                            trackTagsChange(index, tags);
                          }}
                        />
                      </>
                    )}
                  />

                  {/* leetcode questions */}

                  <Controller
                    control={methods.control}
                    name={`interviewRounds.${index}.leetcode_questions`}
                    render={({ field }) => (
                      <div className="mt-4">
                        <div className="flex justify-end">
                          <CustomButton
                            color="primary"
                            size="sm"
                            variant="bordered"
                            onClick={() => {
                              trackLeetcodeQuestionAdd(index);
                              field.onChange([
                                ...(field.value || []),
                                {
                                  question_number: DEFAULT_QUESTION_NUMBER,
                                },
                              ]);
                            }}
                          >
                            Add LeetCode Question
                          </CustomButton>
                        </div>

                        {field.value &&
                          field.value.map((question, qIndex) => {
                            const questionFieldError = getQuestionFieldError(index, qIndex);

                            const isQuestionFieldTouched = checkQuestionFieldTouched(index, qIndex);

                            // Show error if:
                            // 1. Field has been changed from default (not 1) OR
                            // 2. Field was touched OR
                            // 3. Form was submitted
                            const shouldShowError = question.question_number !== DEFAULT_QUESTION_NUMBER || isQuestionFieldTouched || methods.formState.isSubmitted;

                            return (
                              <div key={qIndex} className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center">
                                <Input
                                  isRequired
                                  className="flex-1"
                                  errorMessage={shouldShowError ? questionFieldError?.message : undefined}
                                  isInvalid={!!(shouldShowError && questionFieldError)}
                                  label="Question Number"
                                  placeholder="Enter LeetCode question number"
                                  type="number"
                                  value={question.question_number == null ? "" : String(question.question_number)}
                                  onChange={(e) => {
                                    const newQuestions = [...(field.value || [])];
                                    const parsedValue = parseInt(e.target.value, 10);

                                    newQuestions[qIndex] = {
                                      ...newQuestions[qIndex],
                                      question_number: e.target.value === "" ? null : parsedValue,
                                    };
                                    field.onChange(newQuestions);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "-" || e.key === ".") {
                                      e.preventDefault();
                                    }
                                  }}
                                />

                                <CustomButton
                                  className="w-full sm:w-auto"
                                  color="danger"
                                  size="sm"
                                  onClick={() => {
                                    trackLeetcodeQuestionRemove(index, qIndex);
                                    const newQuestions = field.value?.filter((_, i) => i !== qIndex);

                                    field.onChange(newQuestions?.length ? newQuestions : []);
                                  }}
                                >
                                  Remove
                                </CustomButton>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  />
                </div>
              );
            })}
          </>
        )}

        {!hasFirstResponseDate && <div className="mb-4 text-2xl font-semibold">Please set the first response date before you can add interview rounds</div>}
      </form>
    </FormProvider>
  );
}
