"use client";
import React, { useState, useEffect } from "react";
import { useForm, Controller, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiR } from "~/trpc/react";
import TimezoneSelect, { allTimezones } from "react-timezone-select";
import { Button } from "./ui/button";

const temperatureProfileSchema = z.object({
  bedTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be in HH:MM format"),
  wakeupTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be in HH:MM format"),
  initialSleepLevel: z.number().min(-10).max(10),
  midStageSleepLevel: z.number().min(-10).max(10),
  finalSleepLevel: z.number().min(-10).max(10),
  timezone: z.object({
    value: z.string(),
    label: z.string(),
    altName: z.string().optional(),
    abbrev: z.string().optional(),
  }),
});

type TemperatureProfileForm = z.infer<typeof temperatureProfileSchema>;

export const TemperatureProfileForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isExistingProfile, setIsExistingProfile] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TemperatureProfileForm>({
    resolver: zodResolver(temperatureProfileSchema),
    defaultValues: {
      bedTime: "22:00",
      wakeupTime: "06:00",
      initialSleepLevel: 0,
      midStageSleepLevel: 0,
      finalSleepLevel: 0,
      timezone: { value: "America/New_York", label: "America/New_York" },
    },
  });

  const bedTime = watch("bedTime");
  const wakeupTime = watch("wakeupTime");

  const [sleepInfo, setSleepInfo] = useState({
    duration: "",
    midStageTime: "",
    finalStageTime: "",
  });

  const getUserTemperatureProfileQuery = apiR.user.getUserTemperatureProfile.useQuery();

  useEffect(() => {
    if (getUserTemperatureProfileQuery.isSuccess) {
      const profile = getUserTemperatureProfileQuery.data;
      setValue("bedTime", profile.bedTime.slice(0, 5));
      setValue("wakeupTime", profile.wakeupTime.slice(0, 5));
      setValue("initialSleepLevel", profile.initialSleepLevel / 10);
      setValue("midStageSleepLevel", profile.midStageSleepLevel / 10);
      setValue("finalSleepLevel", profile.finalSleepLevel / 10);
      setValue("timezone", { value: profile.timezoneTZ, label: profile.timezoneTZ });
      setIsExistingProfile(true);
      setIsLoading(false);
    } else if (getUserTemperatureProfileQuery.isError) {
      console.error("Failed to fetch temperature profile. Using default values.", getUserTemperatureProfileQuery.error);
      setIsExistingProfile(false);
      setIsLoading(false);
    }
  }, [getUserTemperatureProfileQuery.isSuccess, getUserTemperatureProfileQuery.isError, getUserTemperatureProfileQuery.data, setValue, getUserTemperatureProfileQuery.error]);

  useEffect(() => {
    if (bedTime && wakeupTime) {
      const bedDate = new Date(`2000-01-01T${bedTime}:00`);
      const wakeDate = new Date(`2000-01-01T${wakeupTime}:00`);

      if (wakeDate <= bedDate) {
        wakeDate.setDate(wakeDate.getDate() + 1);
      }

      const durationMs = wakeDate.getTime() - bedDate.getTime();
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.round((durationMs % (1000 * 60 * 60)) / (1000 * 60));

      const midStageDate = new Date(bedDate.getTime() + 60 * 60 * 1000); // 1 hour after bedtime
      const finalStageDate = new Date(wakeDate.getTime() - 2 * 60 * 60 * 1000); // 2 hours before wakeup

      setSleepInfo({
        duration: `${hours} hours ${minutes} minutes`,
        midStageTime: midStageDate.toTimeString().slice(0, 5),
        finalStageTime: finalStageDate.toTimeString().slice(0, 5),
      });
    }
  }, [bedTime, wakeupTime]);

  const updateProfileMutation =
    apiR.user.updateUserTemperatureProfile.useMutation({
      onSuccess: () => {
        console.log("Temperature profile updated successfully");
        // Handle success (e.g., show success message, update UI)
      },
      onError: (error) => {
        console.error("Failed to update temperature profile:", error.message);
        // Handle error (e.g., show error message)
      },
    });

  const deleteProfileMutation =
    apiR.user.deleteUserTemperatureProfile.useMutation({
      onSuccess: () => {
        console.log("Temperature profile deleted successfully");
        setIsExistingProfile(false);
        reset(); // Reset form to default values
      },
      onError: (error) => {
        console.error("Failed to delete temperature profile:", error.message);
        // Handle error (e.g., show error message)
      },
    });

  const onSubmit = (data: TemperatureProfileForm) => {
    const formatTimeForAPI = (time: string) => `${time}:00.000000`;

    const mutationData = {
      bedTime: formatTimeForAPI(data.bedTime),
      wakeupTime: formatTimeForAPI(data.wakeupTime),
      initialSleepLevel: Math.round(data.initialSleepLevel * 10),
      midStageSleepLevel: Math.round(data.midStageSleepLevel * 10),
      finalSleepLevel: Math.round(data.finalSleepLevel * 10),
      timezoneTZ: data.timezone.value,
    };

    console.log('Data being sent to server:', mutationData);

    updateProfileMutation.mutate(mutationData);
  };

  const onDelete = () => {
    if (window.confirm("Are you sure you want to delete your temperature profile?")) {
      deleteProfileMutation.mutate();
    }
  };

  const SliderInput: React.FC<{
    name: "initialSleepLevel" | "midStageSleepLevel" | "finalSleepLevel";
    label: string;
    control: Control<TemperatureProfileForm>;
    info?: string;
  }> = ({ name, label, control, info }) => (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <Controller
        name={name}
        control={control}
        render={({ field: { onChange, value } }) => (
          <div className="flex items-center">
            <input
              type="range"
              min="-10"
              max="10"
              step="1"
              value={value}
              onChange={(e) => onChange(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
            />
            <span className="ml-2 text-sm text-gray-600">{value}</span>
          </div>
        )}
      />
      {info && <p className="mt-1 text-sm text-blue-600">{info}</p>}
      {errors[name] && (
        <p className="mt-1 text-sm text-red-600">{errors[name]?.message}</p>
      )}
    </div>
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="mx-auto mt-8 max-w-md rounded-lg bg-white p-6 shadow-xl">
      <h2 className="mb-4 text-center text-2xl font-bold text-gray-800">
        {isExistingProfile ? "Update" : "Create"} Temperature Profile
      </h2>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 text-gray-800"
      >
        <div>
          <label
            htmlFor="timezone"
            className="block text-sm font-medium text-gray-700"
          >
            Timezone
          </label>
          <Controller
            name="timezone"
            control={control}
            render={({ field }) => (
              <TimezoneSelect
                value={field.value}
                onChange={field.onChange}
                timezones={{
                  ...allTimezones,
                  "America/New_York": "America/New York",
                  "America/Los_Angeles": "America/Los Angeles",
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              />
            )}
          />
          {errors.timezone && (
            <p className="mt-1 text-sm text-red-600">
              {errors.timezone.message}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="bedTime"
            className="block text-sm font-medium text-gray-700"
          >
            Bed Time
          </label>
          <input
            {...register("bedTime")}
            type="time"
            id="bedTime"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
          {errors.bedTime && (
            <p className="mt-1 text-sm text-red-600">
              {errors.bedTime.message}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="wakeupTime"
            className="block text-sm font-medium text-gray-700"
          >
            Wake-up Time
          </label>
          <input
            {...register("wakeupTime")}
            type="time"
            id="wakeupTime"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
          {errors.wakeupTime && (
            <p className="mt-1 text-sm text-red-600">
              {errors.wakeupTime.message}
            </p>
          )}
        </div>

        <div className="rounded-md bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            Sleep Duration: {sleepInfo.duration}
            <br />
            Bed will prepare for sleep one hour before the bed time.
          </p>
        </div>

        <SliderInput
          name="initialSleepLevel"
          label="Initial Sleep Level"
          control={control}
          info={`Starts at ${bedTime}`}
        />
        <SliderInput
          name="midStageSleepLevel"
          label="Mid-Stage Sleep Level"
          control={control}
          info={`Starts at ${sleepInfo.midStageTime}`}
        />
        <SliderInput
          name="finalSleepLevel"
          label="Final Sleep Level"
          control={control}
          info={`Starts at ${sleepInfo.finalStageTime}`}
        />

        <div className="flex justify-between">
          <Button
            type="submit"
            className="flex-grow rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            disabled={updateProfileMutation.isPending}
          >
            {updateProfileMutation.isPending ? "Updating..." : (isExistingProfile ? "Update" : "Create") + " Profile"}
          </Button>
          {isExistingProfile && (
            <Button
              type="button"
              onClick={onDelete}
              className="ml-4 rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              disabled={deleteProfileMutation.isPending}
            >
              {deleteProfileMutation.isPending ? "Deleting..." : "Delete Schedule"}
            </Button>
          )}
        </div>
        {updateProfileMutation.isError && (
          <p className="mt-4 text-center text-sm text-red-600">
            Error updating profile. Please try again.
            {updateProfileMutation.error.message}
          </p>
        )}
        {deleteProfileMutation.isError && (
          <p className="mt-4 text-center text-sm text-red-600">
            Error deleting profile. Please try again.
            {deleteProfileMutation.error.message}
          </p>
        )}
      </form>
    </div>
  );
};