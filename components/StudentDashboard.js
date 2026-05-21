import SkeletonCard from "@/components/ui/SkeletonCard";
import DashboardSkeleton from "@/components/ui/DashboardSkeleton";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Calendar,
  Clock,
  MapPin,
  Camera,
  CheckCircle,
  AlertCircle,
  User,
  Bell,
  BookOpen,
  TrendingUp,
  Target,
  Award,
  Settings,
  LogOut,
  ChevronRight,
  Wifi,
  Shield,
  Smartphone,
  Eye,
  Users,
  BarChart3,
  Download,
  Filter,
  Search,
  RefreshCw,
  Star,
  Sparkles,
} from "lucide-react";
import { Navbar } from "./Navbar";
import dynamic from "next/dynamic";
import ChartSkeleton from "@/components/ui/ChartSkeleton";

const AttendanceHeatmap = dynamic(
  () => import("./AttendanceHeatmap"),
  { ssr: false, loading: () => <ChartSkeleton variant="heatmap" /> }
);

import { useAuth } from "@/hooks/useAuth";
import { weeklySchedule, mockRecentActivity } from "@/constants/mockData";
import AttendanceAnalytics from "./dashboard/AttendanceAnalytics";

const StudentDashboard = () => {
  const [loading, setLoading] = useState(true);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendanceStatus, setAttendanceStatus] = useState("pending");
  const [todayClasses, setTodayClasses] = useState([]);

  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingClass, setUpcomingClass] = useState(null);
  const [isAttendanceWindow, setIsAttendanceWindow] = useState(false);

  const { user } = useAuth();

  // Mock schedule data is now imported from @/constants/mockData

  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      const hour = now.getHours();
      const minute = now.getMinutes();
      const day = now.getDay();

      const isWeekday = day >= 1 && day <= 5;
      const isAttendanceTime = hour === 9 && minute <= 10;

      setIsAttendanceWindow(isWeekday && isAttendanceTime);

      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];

      const today = dayNames[day];

      setTodayClasses(weeklySchedule[today] || []);

      if (weeklySchedule[today]) {
        const upcoming = weeklySchedule[today].find((cls) => {
          const [startTime] = cls.time.split("-");
          const [classHour, classMinute] = startTime.split(":").map(Number);

          return (
            hour < classHour ||
            (hour === classHour && minute < classMinute)
          );
        });

        setUpcomingClass(upcoming);
      }
    }, 1000);

    setRecentActivity(mockRecentActivity);

    return () => {
      clearInterval(timer);
      clearTimeout(loadingTimer);
    };
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "present":
        return "text-green-400 bg-green-500/10 border-green-500/30";

      case "absent":
        return "text-red-400 bg-red-500/10 border-red-500/30";

      case "late":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";

      default:
        return "text-gray-400 bg-gray-500/10 border-gray-500/30";
    }
  };

  const getUserInitials = () => {
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div>
      {user && user.uid && <AttendanceAnalytics userId={user.uid} />}
      {/* KEEP YOUR ENTIRE EXISTING JSX HERE EXACTLY SAME */}
    </div>
  );
};

export default StudentDashboard;