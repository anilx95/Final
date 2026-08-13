import React, { useEffect, useState } from 'react';
import { Building2, GraduationCap, School, BookOpen, Calendar, Plus, X, Check } from 'lucide-react';
import { adminApi } from '../../api/client';
import { Department, Course, AcademicYear, Subject, Building, Classroom } from '../../types';
import { useToast } from '../../context/ToastContext';

export const AcademicsManagement: React.FC = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'departments' | 'courses' | 'years' | 'subjects' | 'buildings' | 'classrooms'>('departments');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [deptRes, courseRes, yearRes, subjRes, bldgRes, classRes] = await Promise.all([
        adminApi.getDepartments(),
        adminApi.getCourses(),
        adminApi.getAcademicYears(),
        adminApi.getSubjects(),
        adminApi.getBuildings(),
        adminApi.getClassrooms(),
      ]);
      setDepartments(deptRes.data);
      setCourses(courseRes.data);
      setYears(yearRes.data);
      setSubjects(subjRes.data);
      setBuildings(bldgRes.data);
      setClassrooms(classRes.data);
    } catch (err) {
      console.error('Error fetching academic infrastructure:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeTab === 'departments') {
        await adminApi.createDepartment(formData);
      } else if (activeTab === 'courses') {
        await adminApi.createCourse(formData);
      } else if (activeTab === 'years') {
        await adminApi.createAcademicYear(formData);
      } else if (activeTab === 'subjects') {
        await adminApi.createSubject(formData);
      } else if (activeTab === 'buildings') {
        await adminApi.createBuilding(formData);
      } else if (activeTab === 'classrooms') {
        await adminApi.createClassroom(formData);
      }

      addToast({
        type: 'success',
        title: 'Item Created Successfully',
        description: `New ${activeTab.slice(0, -1)} has been registered.`,
      });
      setIsModalOpen(false);
      setFormData({});
      loadData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Creation Failed',
        description: err.response?.data?.detail || 'Validation error while creating item.',
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-sky-400" /> Academic & Physical Infrastructure
          </h1>
          <p className="text-xs text-slate-400">Configure departments, degree programs, subjects, smart buildings, and classrooms</p>
        </div>

        <button
          onClick={() => {
            setFormData({});
            setIsModalOpen(true);
          }}
          className="btn-primary text-xs"
        >
          <Plus className="w-4 h-4" /> Add New {activeTab.slice(0, -1).toUpperCase()}
        </button>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-1">
        {[
          { id: 'departments', label: 'Departments', icon: Building2 },
          { id: 'courses', label: 'Courses / Majors', icon: GraduationCap },
          { id: 'years', label: 'Academic Years', icon: Calendar },
          { id: 'subjects', label: 'Subjects', icon: BookOpen },
          { id: 'buildings', label: 'Smart Buildings', icon: School },
          { id: 'classrooms', label: 'Classrooms', icon: School },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-sky-500 text-sky-400 bg-sky-500/10'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="card text-center py-12 text-slate-400">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading academic records...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTab === 'departments' &&
            departments.map((d) => (
              <div key={d.id} className="card p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
                    {d.code}
                  </span>
                  <span className="text-[11px] text-slate-400">{d.total_courses || 0} Courses</span>
                </div>
                <h3 className="font-bold text-slate-100 text-base">{d.name}</h3>
                <p className="text-xs text-slate-400">{d.description || 'Department of University Studies'}</p>
                <div className="text-[11px] text-slate-300 pt-2 border-t border-slate-800">
                  Head of Department: <span className="font-semibold text-slate-100">{d.head_of_department || 'Dr. Professor'}</span>
                </div>
              </div>
            ))}

          {activeTab === 'courses' &&
            courses.map((c) => (
              <div key={c.id} className="card p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                    {c.code}
                  </span>
                  <span className="text-[11px] text-slate-400">{c.duration_years} Years</span>
                </div>
                <h3 className="font-bold text-slate-100 text-base">{c.name}</h3>
                <p className="text-xs text-slate-400">{c.department_name || 'Academic Major'}</p>
              </div>
            ))}

          {activeTab === 'years' &&
            years.map((y) => (
              <div key={y.id} className="card p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-100">{y.year_label}</span>
                  {y.is_current && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      Active Term
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 space-y-1 pt-2">
                  <div>Start: {new Date(y.start_date).toLocaleDateString()}</div>
                  <div>End: {new Date(y.end_date).toLocaleDateString()}</div>
                </div>
              </div>
            ))}

          {activeTab === 'subjects' &&
            subjects.map((s) => (
              <div key={s.id} className="card p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                    {s.code}
                  </span>
                  <span className="text-[11px] text-slate-400">{s.credits} Credits</span>
                </div>
                <h3 className="font-bold text-slate-100 text-base">{s.name}</h3>
                <p className="text-xs text-slate-400">{s.description || 'Core subject module'}</p>
              </div>
            ))}

          {activeTab === 'buildings' &&
            buildings.map((b) => (
              <div key={b.id} className="card p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    {b.code}
                  </span>
                  <span className="text-[11px] text-slate-400">{b.total_floors} Floors</span>
                </div>
                <h3 className="font-bold text-slate-100 text-base">{b.name}</h3>
                <div className="flex items-center gap-2 pt-2 text-[10px]">
                  {b.has_elevator && <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded">Elevators Installed</span>}
                  {b.has_wheelchair_ramps && <span className="bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded">Wheelchair Ramps</span>}
                </div>
              </div>
            ))}

          {activeTab === 'classrooms' &&
            classrooms.map((cl) => (
              <div key={cl.id} className="card p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                    {cl.code || `CR-${cl.id}`}
                  </span>
                  <span className="text-[11px] text-slate-400">Capacity: {cl.capacity || 60}</span>
                </div>
                <h3 className="font-bold text-slate-100 text-base">{cl.name}</h3>
                <p className="text-xs text-slate-400">{cl.building || 'Main Block'} - Floor {cl.floor || 1}</p>
                <div className="flex flex-wrap gap-1 pt-2 text-[10px]">
                  {cl.has_smart_board && <span className="bg-sky-500/15 text-sky-300 px-2 py-0.5 rounded">Smart Board</span>}
                  {cl.has_audio_system && <span className="bg-purple-500/15 text-purple-300 px-2 py-0.5 rounded">Assistive Audio</span>}
                  {cl.has_wheelchair_ramp && <span className="bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded">Ramp Access</span>}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-slate-100 text-sm capitalize">
                Create New {activeTab.slice(0, -1)}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Code / Identifier</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS-101"
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="input-field py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Name / Title</label>
                <input
                  type="text"
                  required
                  placeholder="Name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field py-2 text-xs"
                />
              </div>

              {activeTab === 'departments' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Head of Department</label>
                  <input
                    type="text"
                    placeholder="Dr. Smith"
                    value={formData.head_of_department || ''}
                    onChange={(e) => setFormData({ ...formData, head_of_department: e.target.value })}
                    className="input-field py-2 text-xs"
                  />
                </div>
              )}

              {activeTab === 'courses' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Department ID</label>
                  <input
                    type="number"
                    required
                    value={formData.department_id || 1}
                    onChange={(e) => setFormData({ ...formData, department_id: Number(e.target.value) })}
                    className="input-field py-2 text-xs"
                  />
                </div>
              )}

              {activeTab === 'years' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value, year_label: formData.name || '2026-2027' })}
                      className="input-field py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">End Date</label>
                    <input
                      type="date"
                      required
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="input-field py-2 text-xs"
                    />
                  </div>
                </>
              )}

              <button type="submit" className="btn-primary w-full mt-4 text-xs">
                Submit & Create
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
