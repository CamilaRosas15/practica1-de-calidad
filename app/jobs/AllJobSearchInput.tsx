"use client";

import React, { useState } from "react";
import { Input } from "@heroui/react";
import { useQueryStates } from "nuqs";
import useSWR from "swr";
import mixpanel from "mixpanel-browser";

import { JobFiltersModal } from "./JobFiltersModal";

import { CustomButton } from "@/components/CustomButton";
import { FilterIcon } from "@/components/icons";
import { API } from "@/lib/constants/apiRoutes";
import { fetcher } from "@/lib/fetcher";
import { SettingsJobSearchResponse } from "@/app/api/(protected)/settings/job-search/route";
import { JobSortOrderKey, nuqsJobSearchParamSchema } from "@/lib/schema/nuqsJobSearchParamSchema";
import { createFilterValidCountries, filterValidExperienceLevels, filterValidJobCategories, getValidOrDefaults } from "@/lib/nuqsJobSearchParamFilter";

type AllJobSearchInputProps = {
  search: string;
  onSearchChange: (newSearch: string) => void;
};

export function AllJobSearchInput({ search, onSearchChange }: AllJobSearchInputProps) {
  const {
    data: settingsPreferences = {
      available_countries: [],
      all_experience_levels: [],
      all_job_categories: [],
      default_countries: [],
      default_experience_levels: [],
      default_job_categories: [],
    } as SettingsJobSearchResponse,
    isLoading,
  } = useSWR<SettingsJobSearchResponse>(API.PROTECTED.getJobSearchSettings, fetcher);

  // console.warn("settingsPreferences", settingsPreferences);

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [{ isVerified, countries, sortOrder, experienceLevelNames, page, jobCategoryNames }, setQueryStates] = useQueryStates(nuqsJobSearchParamSchema);

  // #region UI-level validation - filter out invalid values when displaying or when URL missing param (default)
  const uiExperienceLevelNames = getValidOrDefaults({
    values: experienceLevelNames,
    filterFn: filterValidExperienceLevels,
    defaults: settingsPreferences.default_experience_levels,
  });

  const uiJobCategoryNames = getValidOrDefaults({
    values: jobCategoryNames,
    filterFn: filterValidJobCategories,
    defaults: settingsPreferences.default_job_categories,
  });

  const uiCountries = getValidOrDefaults({
    values: countries,
    filterFn: createFilterValidCountries(settingsPreferences.available_countries),
    defaults: settingsPreferences.default_countries,
  });
  // #endregion

  const handleCountriesChange = (selectedCountries: string[]) => {
    mixpanel.track("All Jobs Action", {
      action: "countries_changed",
      countries: selectedCountries,
      search,
      is_verified: isVerified,
      sort_order: sortOrder,
      experience_level_names: experienceLevelNames,
      page,
      job_category_names: jobCategoryNames,
    });
    setQueryStates({ countries: selectedCountries, page: 1 });
  };

  const handleVerifiedChange = (isSelected: boolean) => {
    mixpanel.track("All Jobs Action", {
      action: "verified_jobs_toggled",
      is_verified: `from ${isVerified} to ${isSelected}`,
      search,
      countries,
      sort_order: sortOrder,
      experience_level_names: experienceLevelNames,
      page,
      job_category_names: jobCategoryNames,
    });
    setQueryStates({ isVerified: isSelected, page: 1 });
  };

  const handleSortChange = (newOrder: JobSortOrderKey) => {
    mixpanel.track("All Jobs Filter", {
      action: "sort_changed",
      sort_order: newOrder,
      search,
      countries,
      is_verified: isVerified,
      experience_level_names: experienceLevelNames,
      page,
      job_category_names: jobCategoryNames,
    });
    setQueryStates({ sortOrder: newOrder, page: 1 });
  };

  const handleExperienceLevelChange = (newExperienceLevelNames: ExperienceLevel[]) => {
    mixpanel.track("All Jobs Action", {
      action: "experience_level_changed",
      experience_level_names: newExperienceLevelNames,
      search,
      countries,
      is_verified: isVerified,
      sort_order: sortOrder,
      page,
      job_category_names: jobCategoryNames,
    });
    setQueryStates({ experienceLevelNames: newExperienceLevelNames, page: 1 });
  };

  const handleJobCategoryChange = (newJobCategoryNames: JobCategoryName[]) => {
    mixpanel.track("All Jobs Action", {
      action: "job_category_changed",
      job_category_names: newJobCategoryNames,
      search,
      countries,
      is_verified: isVerified,
      sort_order: sortOrder,
      experience_level_names: experienceLevelNames,
      page,
    });
    setQueryStates({ jobCategoryNames: newJobCategoryNames, page: 1 });
  };

  return (
    <>
      <div className="flex gap-2">
        <Input className="flex-1" placeholder="Search job title or company name..." value={search} onChange={(e) => onSearchChange(e.target.value)} />
        {/* Mobile: Icon only, Desktop: Icon + Text */}
        <CustomButton className="!w-14 !min-w-fit sm:!w-auto" isIconOnly={false} startContent={<FilterIcon size={20} />} variant="flat" onPress={() => setIsFilterModalOpen(true)}>
          <span className="hidden sm:inline">Filters</span>
        </CustomButton>
      </div>

      {isFilterModalOpen && !isLoading && (
        <JobFiltersModal
          availableCountries={settingsPreferences.available_countries}
          experienceLevels={settingsPreferences.all_experience_levels}
          isOpen={isFilterModalOpen}
          isVerified={isVerified}
          jobCategories={settingsPreferences.all_job_categories}
          selectedCountries={uiCountries}
          selectedExperienceLevelNames={uiExperienceLevelNames}
          selectedJobCategoryNames={uiJobCategoryNames}
          sortOrder={sortOrder}
          onClose={() => setIsFilterModalOpen(false)}
          onCountriesChange={handleCountriesChange}
          onExperienceLevelChange={handleExperienceLevelChange}
          onJobCategoryChange={handleJobCategoryChange}
          onSortChange={handleSortChange}
          onVerifiedChange={handleVerifiedChange}
        />
      )}
    </>
  );
}
