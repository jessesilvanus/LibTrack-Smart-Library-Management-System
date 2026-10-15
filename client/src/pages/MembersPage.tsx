import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Plus,
  Filter,
  UserCheck,
  BookMarked,
  UserX,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  ArrowUpDown,
  Mail,
  Phone,
} from 'lucide-react';
import { Member, MemberSummary, Pagination, Loan } from '../types';
import {
  fetchMembers,
  createMember,
  updateMember,
  deleteMember,
  fetchMemberById,
} from '../services/api';
import { Badge, BadgeVariant } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Drawer } from '../components/ui/Drawer';
import { PaginationControls } from '../components/ui/PaginationControls';

interface MemberFormData {
  memberId: string;
  fullName: string;
  email: string;
  department: string;
  contactNumber: string;
  memberType: 'STUDENT' | 'FACULTY' | 'STAFF';
  membershipStatus: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  maxBorrowLimit: number;
}

const initialFormData: MemberFormData = {
  memberId: '',
  fullName: '',
  email: '',
  department: '',
  contactNumber: '',
  memberType: 'STUDENT',
  membershipStatus: 'ACTIVE',
  maxBorrowLimit: 4,
};

export const MembersPage: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [summary, setSummary] = useState<MemberSummary>({
    totalMembers: 0,
    activeMembers: 0,
    borrowingMembersCount: 0,
    departments: [],
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal & Drawer states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MemberFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);

  // Details Drawer
  const [selectedMemberDetails, setSelectedMemberDetails] = useState<{
    member: Member;
    activeLoans: Loan[];
    totalHistoricalLoans: number;
  } | null>(null);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Delete/Archive Confirmation Modal
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadMembers = useCallback(async (pageToLoad = pagination.page) => {
    setIsLoading(true);
    setErrorMessage(null);

    const res = await fetchMembers({
      search,
      department,
      status,
      sortBy,
      sortOrder,
      page: pageToLoad,
      limit: pagination.limit,
    });

    if (res.success) {
      setMembers(res.data.members);
      setPagination(res.data.pagination);
      setSummary(res.data.summary);
    } else {
      setErrorMessage(res.error.message || 'Failed to retrieve members directory.');
    }
    setIsLoading(false);
  }, [search, department, status, sortBy, sortOrder, pagination.limit, pagination.page]);

  useEffect(() => {
    loadMembers(1);
  }, [search, department, status, sortBy, sortOrder]);

  const handleOpenAddModal = () => {
    setEditingMemberId(null);
    setFormData(initialFormData);
    setFormErrors({});
    setFormSuccessMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (member: Member) => {
    setEditingMemberId(member._id);
    setFormData({
      memberId: member.memberId,
      fullName: member.fullName,
      email: member.email,
      department: member.department,
      contactNumber: member.contactNumber || '',
      memberType: member.memberType || 'STUDENT',
      membershipStatus: member.membershipStatus,
      maxBorrowLimit: member.maxBorrowLimit || (member.memberType === 'FACULTY' ? 10 : 4),
    });
    setFormErrors({});
    setFormSuccessMessage(null);
    setIsModalOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.memberId.trim()) errors.memberId = 'Member / Student ID is required';
    if (!formData.fullName.trim()) errors.fullName = 'Full name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      errors.email = 'Please provide a valid email format';
    }
    if (!formData.department.trim()) errors.department = 'Department is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setFormSuccessMessage(null);

    const payload = {
      memberId: formData.memberId.trim().toUpperCase(),
      fullName: formData.fullName.trim(),
      email: formData.email.trim().toLowerCase(),
      department: formData.department.trim(),
      contactNumber: formData.contactNumber.trim() || undefined,
      memberType: formData.memberType,
      membershipStatus: formData.membershipStatus,
      maxBorrowLimit: Number(formData.maxBorrowLimit),
    };

    if (editingMemberId) {
      const res = await updateMember(editingMemberId, payload);
      if (res.success) {
        setFormSuccessMessage('Member profile updated successfully.');
        setTimeout(() => {
          setIsModalOpen(false);
          loadMembers();
        }, 800);
      } else {
        setFormErrors({ general: res.error.message });
      }
    } else {
      const res = await createMember(payload);
      if (res.success) {
        setFormSuccessMessage('Member registered successfully.');
        setTimeout(() => {
          setIsModalOpen(false);
          loadMembers(1);
        }, 800);
      } else {
        setFormErrors({ general: res.error.message });
      }
    }
    setIsSubmitting(false);
  };

  const handleViewDetails = async (member: Member) => {
    setIsLoadingDetails(true);
    setIsDetailsDrawerOpen(true);
    const res = await fetchMemberById(member._id);
    if (res.success) {
      setSelectedMemberDetails(res.data);
    }
    setIsLoadingDetails(false);
  };

  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    setIsDeleting(true);
    setDeleteErrorMessage(null);

    const res = await deleteMember(memberToDelete._id);
    if (res.success) {
      setIsDeleteModalOpen(false);
      setMemberToDelete(null);
      loadMembers();
    } else {
      setDeleteErrorMessage(res.error.message);
    }
    setIsDeleting(false);
  };

  const getStatusBadge = (status: Member['membershipStatus']): { label: string; variant: BadgeVariant } => {
    switch (status) {
      case 'ACTIVE':
        return { label: 'Active', variant: 'success' };
      case 'SUSPENDED':
        return { label: 'Suspended', variant: 'danger' };
      case 'EXPIRED':
        return { label: 'Expired', variant: 'warning' };
      default:
        return { label: status, variant: 'neutral' };
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Members</span>
            <Users className="w-4 h-4 text-[#1B2A4A]" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{summary.totalMembers}</p>
          <span className="text-[11px] text-slate-400">Enrolled library patrons</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Status</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">{summary.activeMembers}</p>
          <span className="text-[11px] text-slate-400">Eligible for circulation</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Borrowing</span>
            <BookMarked className="w-4 h-4 text-[#0D9488]" />
          </div>
          <p className="text-2xl font-bold text-[#0D9488]">{summary.borrowingMembersCount}</p>
          <span className="text-[11px] text-slate-400">Currently holding books</span>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Inactive / Suspended</span>
            <UserX className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-700">
            {summary.totalMembers - summary.activeMembers}
          </p>
          <span className="text-[11px] text-slate-400">Requires clearance/renewal</span>
        </div>
      </div>

      {/* 2. Filter & Action Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, student ID, email, department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488] focus:bg-white transition-all"
            />
          </div>

          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenAddModal}
          >
            Register Member
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-medium flex items-center gap-1.5 mr-1">
            <Filter className="w-3.5 h-3.5" />
            Filters:
          </span>

          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30"
          >
            <option value="">All Departments</option>
            {summary.departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Members</option>
            <option value="SUSPENDED">Suspended Members</option>
            <option value="EXPIRED">Expired Membership</option>
          </select>

          <div className="flex items-center gap-1 ml-auto">
            <span className="text-slate-500 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30"
            >
              <option value="createdAt">Recently Enrolled</option>
              <option value="fullName">Full Name (A-Z)</option>
              <option value="memberId">Member ID</option>
              <option value="department">Department</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
              title={`Sorting ${sortOrder.toUpperCase()}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <p>{errorMessage}</p>
          <Button variant="outline" size="sm" onClick={() => loadMembers()}>
            Retry
          </Button>
        </div>
      )}

      {/* 3. Members Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th scope="col" className="px-4 py-3">Member ID</th>
                <th scope="col" className="px-4 py-3">Full Name &amp; Role</th>
                <th scope="col" className="px-4 py-3">Department</th>
                <th scope="col" className="px-4 py-3">Email &amp; Contact</th>
                <th scope="col" className="px-4 py-3 text-center">Status</th>
                <th scope="col" className="px-4 py-3 text-center">Loans (Active / Quota)</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-4 py-3.5"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 bg-slate-200 rounded w-40 mb-1" /><div className="h-3 bg-slate-100 rounded w-16" /></td>
                    <td className="px-4 py-3.5"><div className="h-3.5 bg-slate-200 rounded w-28" /></td>
                    <td className="px-4 py-3.5"><div className="h-3.5 bg-slate-200 rounded w-36" /></td>
                    <td className="px-4 py-3.5 text-center"><div className="h-5 bg-slate-200 rounded-full w-16 mx-auto" /></td>
                    <td className="px-4 py-3.5 text-center"><div className="h-5 bg-slate-200 rounded w-16 mx-auto" /></td>
                    <td className="px-4 py-3.5 text-right"><div className="h-6 bg-slate-200 rounded w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-300" aria-hidden="true" />
                      <p className="font-semibold text-slate-700 text-sm">No members found</p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        Adjust search filters or register a student/faculty member.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  const statusMeta = getStatusBadge(member.membershipStatus);
                  const activeCount = member.currentBorrowedCount || 0;
                  const limit = member.maxBorrowLimit || (member.memberType === 'FACULTY' ? 10 : 4);

                  return (
                    <tr
                      key={member._id}
                      className="hover:bg-slate-50/70 transition-colors duration-150"
                    >
                      {/* ID */}
                      <td className="px-4 py-3 font-mono font-semibold text-slate-900 text-[11px]">
                        {member.memberId}
                      </td>

                      {/* Name & Role */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 leading-tight">
                          {member.fullName}
                        </div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                          {member.memberType || 'STUDENT'}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3 text-slate-700">
                        {member.department}
                      </td>

                      {/* Email & Phone */}
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[200px]">{member.email}</span>
                        </div>
                        {member.contactNumber && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 font-mono">
                            <Phone className="w-3 h-3" />
                            <span>{member.contactNumber}</span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <Badge variant={statusMeta.variant} dot>
                          {statusMeta.label}
                        </Badge>
                      </td>

                      {/* Active Loans vs Limit */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-semibold ${
                            activeCount >= limit ? 'text-amber-700' : 'text-slate-900'
                          }`}
                        >
                          {activeCount}
                        </span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-slate-600">{limit}</span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleViewDetails(member)}
                            className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="View Member Profile & Borrowed Books"
                            aria-label={`View details for ${member.fullName}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(member)}
                            className="p-1.5 rounded text-slate-500 hover:text-[#0D9488] hover:bg-teal-50 transition-colors"
                            title="Edit Member Details"
                            aria-label={`Edit ${member.fullName}`}
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setMemberToDelete(member);
                              setDeleteErrorMessage(null);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Archive / Deactivate Member"
                            aria-label={`Archive ${member.fullName}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls
          pagination={pagination}
          onPageChange={(p) => loadMembers(p)}
          isLoading={isLoading}
        />
      </div>

      {/* ============================================================ */}
      {/* REGISTER / EDIT MEMBER MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMemberId ? 'Update Member Profile' : 'Register Library Member'}
        subtitle="Manage student and faculty institutional borrowing privileges"
        maxWidth="md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formErrors.general && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {formErrors.general}
            </div>
          )}
          {formSuccessMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              {formSuccessMessage}
            </div>
          )}

          {/* Member ID & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Member / Student ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.memberId}
                onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                placeholder="e.g. STU-2026-1045"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
              />
              {formErrors.memberId && (
                <p className="text-rose-600 text-[11px] mt-0.5">{formErrors.memberId}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Member Classification
              </label>
              <select
                value={formData.memberType}
                onChange={(e) => {
                  const type = e.target.value as 'STUDENT' | 'FACULTY' | 'STAFF';
                  setFormData({
                    ...formData,
                    memberType: type,
                    maxBorrowLimit: type === 'FACULTY' ? 10 : type === 'STAFF' ? 6 : 4,
                  });
                }}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30"
              >
                <option value="STUDENT">Student (Quota: 4 Books)</option>
                <option value="FACULTY">Faculty / Professor (Quota: 10 Books)</option>
                <option value="STAFF">College Staff (Quota: 6 Books)</option>
              </select>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="e.g. Aditi Krishnan"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
            />
            {formErrors.fullName && (
              <p className="text-rose-600 text-[11px] mt-0.5">{formErrors.fullName}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Institutional Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. aditi.k@demo.libtrack.edu"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
            />
            {formErrors.email && (
              <p className="text-rose-600 text-[11px] mt-0.5">{formErrors.email}</p>
            )}
          </div>

          {/* Department & Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g. Computer Science & Eng"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
              />
              {formErrors.department && (
                <p className="text-rose-600 text-[11px] mt-0.5">{formErrors.department}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Number <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                placeholder="e.g. +91-98765-01045"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
              />
            </div>
          </div>

          {/* Status & Borrow Limit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Membership Status
              </label>
              <select
                value={formData.membershipStatus}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    membershipStatus: e.target.value as 'ACTIVE' | 'EXPIRED' | 'SUSPENDED',
                  })
                }
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30"
              >
                <option value="ACTIVE">ACTIVE (Clearance OK)</option>
                <option value="SUSPENDED">SUSPENDED (Holds Pending)</option>
                <option value="EXPIRED">EXPIRED (Semester End)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Borrowing Limit (Books)
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.maxBorrowLimit}
                onChange={(e) =>
                  setFormData({ ...formData, maxBorrowLimit: parseInt(e.target.value, 10) || 4 })
                }
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              {editingMemberId ? 'Save Profile' : 'Complete Registration'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* MEMBER DETAILS DRAWER */}
      {/* ============================================================ */}
      <Drawer
        isOpen={isDetailsDrawerOpen}
        onClose={() => setIsDetailsDrawerOpen(false)}
        title={selectedMemberDetails?.member.fullName || 'Member Profile'}
        subtitle="Patron Status & Borrowing Summary"
        width="lg"
      >
        {isLoadingDetails || !selectedMemberDetails ? (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
            Loading member borrowing records...
          </div>
        ) : (
          <div className="space-y-6 text-xs">
            {/* Patron Profile Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <span className="font-bold text-slate-900 text-sm block">
                    {selectedMemberDetails.member.fullName}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    ID: {selectedMemberDetails.member.memberId}
                  </span>
                </div>
                <Badge variant={getStatusBadge(selectedMemberDetails.member.membershipStatus).variant} dot>
                  {selectedMemberDetails.member.membershipStatus}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-600">
                <div>
                  <span className="text-[11px] text-slate-400 block">Department</span>
                  <span className="font-semibold text-slate-900">
                    {selectedMemberDetails.member.department}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Classification</span>
                  <span className="font-semibold text-slate-900">
                    {selectedMemberDetails.member.memberType || 'STUDENT'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Email Address</span>
                  <span className="text-slate-900">{selectedMemberDetails.member.email}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Contact Phone</span>
                  <span className="font-mono text-slate-900">
                    {selectedMemberDetails.member.contactNumber || 'None provided'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quota Indicators */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-400 text-[11px] block">Current Loans</span>
                <span className="text-lg font-bold text-[#0D9488]">
                  {selectedMemberDetails.activeLoans.length}
                </span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-400 text-[11px] block">Quota Limit</span>
                <span className="text-lg font-bold text-slate-900">
                  {selectedMemberDetails.member.maxBorrowLimit || 4}
                </span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-400 text-[11px] block">Lifetime Loans</span>
                <span className="text-lg font-bold text-slate-700">
                  {selectedMemberDetails.totalHistoricalLoans}
                </span>
              </div>
            </div>

            {/* Currently Borrowed Books Section */}
            <div>
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-200">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                  Books Currently Checked Out ({selectedMemberDetails.activeLoans.length})
                </h4>
              </div>

              {selectedMemberDetails.activeLoans.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-lg text-slate-400">
                  No books currently borrowed. Clear standing.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedMemberDetails.activeLoans.map((loan) => {
                    const isOverdue = new Date(loan.dueDate).getTime() < Date.now();
                    return (
                      <div
                        key={loan._id}
                        className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{loan.book?.title}</p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                            <span>ISBN: {loan.book?.isbn}</span>
                            <span>•</span>
                            <span>Shelf: {loan.book?.shelfLocation}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 block font-mono">
                            Due: {new Date(loan.dueDate).toLocaleDateString()}
                          </span>
                          <Badge variant={isOverdue ? 'danger' : 'info'} dot>
                            {isOverdue ? 'Overdue' : 'Active'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* ============================================================ */}
      {/* ARCHIVE CONFIRMATION MODAL */}
      {/* ============================================================ */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Member Archival"
        subtitle="Institutional borrower clearance rule"
        maxWidth="md"
      >
        <div className="space-y-4">
          {deleteErrorMessage ? (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Archival Blocked</p>
                <p className="mt-0.5">{deleteErrorMessage}</p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Borrower Clearance Check:</p>
                <p className="mt-0.5">
                  Are you sure you want to deactivate <span className="font-semibold">"{memberToDelete?.fullName}"</span> ({memberToDelete?.memberId})?
                  Historical borrowing records will be preserved for library audit compliance.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            {!deleteErrorMessage && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                isLoading={isDeleting}
              >
                Confirm Archival
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
