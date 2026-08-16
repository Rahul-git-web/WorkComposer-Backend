export default function resolveTrackingSettings(organization, user) {
  return {
    tracking: {
      trackingMode:
        user?.trackingSettings?.trackingMode ??
        organization?.tracking?.trackingMode,

      startTrackingOnBoot:
        user?.trackingSettings?.startTrackingOnBoot ??
        organization?.tracking?.startTrackingOnBoot,

      allowWorkAwayFromComputer:
        user?.trackingSettings?.allowWorkAwayFromComputer ??
        organization?.tracking?.allowWorkAwayFromComputer,

      pauseTrackingWhenInactive:
        user?.trackingSettings?.pauseTrackingWhenInactive ??
        organization?.tracking?.pauseTrackingWhenInactive,

      inactivityMinutes:
        user?.trackingSettings?.inactivityMinutes ??
        organization?.tracking?.inactivityMinutes,

      continueTrackingDuringSleep:
        user?.trackingSettings?.continueTrackingDuringSleep ??
        organization?.tracking?.continueTrackingDuringSleep,

      sleepBreakHours:
        user?.trackingSettings?.sleepBreakHours ??
        organization?.tracking?.sleepBreakHours,

      sleepBreakMinutes:
        user?.trackingSettings?.sleepBreakMinutes ??
        organization?.tracking?.sleepBreakMinutes,

      displayBackToWorkReminder:
        user?.trackingSettings?.displayBackToWorkReminder ??
        organization?.tracking?.displayBackToWorkReminder,

      stopTrackingWithoutInternet:
        user?.trackingSettings?.stopTrackingWithoutInternet ??
        organization?.tracking?.stopTrackingWithoutInternet,

      statusBarVisibility:
        user?.trackingSettings?.statusBarVisibility ??
        organization?.tracking?.statusBarVisibility,

      applicationTracking:
        user?.trackingSettings?.applicationTracking ??
        organization?.tracking?.applicationTracking,

      ipTracking:
        user?.trackingSettings?.ipTracking ??
        organization?.tracking?.ipTracking,
    },

    screenCapture: {
      enabled:
        user?.screenCaptureSettings?.enabled ??
        organization?.screenCapture?.enabled,

      randomizeFrequency:
        user?.screenCaptureSettings?.randomizeFrequency ??
        organization?.screenCapture?.randomizeFrequency,

      screenshotFrequency:
        user?.screenCaptureSettings?.screenshotFrequency ??
        organization?.screenCapture?.screenshotFrequency,

      blurScreenshots:
        user?.screenCaptureSettings?.blurScreenshots ??
        organization?.screenCapture?.blurScreenshots,
    },

    manualTime: {
      allowManualTime:
        user?.manualTimeSettings?.allowManualTime ??
        organization?.manualTime?.allowManualTime,

      requireApproval:
        user?.manualTimeSettings?.requireApproval ??
        organization?.manualTime?.requireApproval,

      managerApproval:
        user?.manualTimeSettings?.managerApproval ??
        organization?.manualTime?.managerApproval,

      backdatingLimit:
        user?.manualTimeSettings?.backdatingLimit ??
        organization?.manualTime?.backdatingLimit,

      requireProjectTask:
        user?.manualTimeSettings?.requireProjectTask ??
        organization?.manualTime?.requireProjectTask,
    },

    shift: {
      enabled: user?.shiftSettings?.enabled ?? organization?.shift?.enabled,

      autoStartTracking:
        user?.shiftSettings?.autoStartTracking ??
        organization?.shift?.autoStartTracking,

      autoStopTracking:
        user?.shiftSettings?.autoStopTracking ??
        organization?.shift?.autoStopTracking,

      stopTrackingDuringBreaks:
        user?.shiftSettings?.stopTrackingDuringBreaks ??
        organization?.shift?.stopTrackingDuringBreaks,

      schedule: user?.shiftSettings?.schedule ?? organization?.shift?.schedule,
    },
  };
}
