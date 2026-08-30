import React, { useEffect, useState } from 'react';
import { Building2, GraduationCap, School, BookOpen, Calendar, Plus } from 'lucide-react';
import { adminApi } from '../../api/client';
import { Department, Course, AcademicYear, Subject, Building, Classroom } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';

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
      setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
      setCourses(Array.isArray(courseRes.data) ? courseRes.data : []);
      setYears(Array.isArray(yearRes.data) ? yearRes.data : []);
      setSubjects(Array.isArray(subjRes.data) ? subjRes.data : []);
      setBuildings(Array.isArray(bldgRes.data) ? bldgRes.data : []);
      setClassrooms(Array.isArray(classRes.data) ? classRes.data : []);
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
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2.5 tracking-tight">
            <Building2 className="w-5 h-5 text-sky-400" /> Academic & Campus Infrastructure
          </h1>
          <p className="text-xs text-slate-400 mt-1">Configure departments, degree programs, subjects, smart buildings, and classrooms</p>
        </div>

        <Button
          onClick={() => {
            setFormData({});
            setIsModalOpen(true);
          }}
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add New {activeTab.slice(0, -1).toUpperCase()}
        </Button>
      </div>

      {/* Tabs Bar */}
      <Tabs
        tabs={[
          { id: 'departments', label: 'Departments', count: departments.length },
          { id: 'courses', label: 'Courses / Majors', count: courses.length },
          { id: 'years', label: 'Academic Years', count: years.length },
          { id: 'subjects', label: 'Subjects', count: subjects.length },
          { id: 'buildings', label: 'Smart Buildings', count: buildings.length },
          { id: 'classrooms', label: 'Classrooms', count: classrooms.length },
        ]}
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as any)}
      />

      {/* Tab Contents */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-xs">
          Loading academic records...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeTab === 'departments' &&
            departments.map((d) => (
              <Card key={d.id} variant="default" className="p-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Badge variant="brand" size="sm">
                    {d.code}
                  </Badge>
                  <span className="text-[11px] text-slate-400 font-mono">{d.total_courses || 0} Courses</span>
                </div>
                <h3 className="font-bold text-slate-100 text-sm sm:text-base tracking-tight">{d.name}</h3>
                <p className="text-xs text-slate-400">{d.description || 'Department of University Studies'}</p>
                <div className="text-[11px] text-slate-300 pt-2 border-t border-[#1b2538]">
                  Head of Dept: <strong className="text-slate-100">{d.head_of_department || 'Dr. Professor'}</strong>
                </div>
              </Card>
            ))}

          {activeTab === 'courses' &&
            courses.map((c) => (
              <Card key={c.id} variant="default" className="p-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Badge variant="ai" size="sm">
                    {c.code}
                  </Badge>
                  <span className="text-[11px] text-slate-400 font-mono">{c.duration_years} Years</span>
                </div>
                <h3 className="font-bold text-slate-100 text-sm sm:text-base tracking-tight">{c.name}</h3>
                <p className="text-xs text-slate-400">{c.department_name || 'Academic Major'}</p>
              </Card>
            ))}

          {activeTab === 'years' &&
            years.map((y) => (
              <Card key={y.id} variant="default" className="p-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-100 tracking-tight">{y.year_label}</span>
                  {y.is_current && (
                    <Badge variant="success" size="sm">
                      Active Term
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-slate-400 space-y-1 pt-2 font-mono text-[11px]">
                  <div>Start: {new Date(y.start_date).toLocaleDateString()}</div>
                  <div>End: {new Date(y.end_date).toLocaleDateString()}</div>
                </div>
              </Card>
            ))}

          {activeTab === 'subjects' &&
            subjects.map((s) => (
              <Card key={s.id} variant="default" className="p-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Badge variant="ai" size="sm">
                    {s.code}
                  </Badge>
                  <span className="text-[11px] text-slate-400 font-mono">{s.credits} Credits</span>
                </div>
                <h3 className="font-bold text-slate-100 text-sm sm:text-base tracking-tight">{s.name}</h3>
                <p className="text-xs text-slate-400">{s.description || 'Core subject module'}</p>
              </Card>
            ))}

          {activeTab === 'buildings' &&
            buildings.map((b) => (
              <Card key={b.id} variant="default" className="p-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Badge variant="brand" size="sm">
                    {b.code}
                  </Badge>
                  <span className="text-[11px] text-slate-400 font-mono">{b.total_floors} Floors</span>
                </div>
                <h3 className="font-bold text-slate-100 text-sm sm:text-base tracking-tight">{b.name}</h3>
                <div className="flex items-center gap-1.5 pt-2 text-[10px]">
                  {b.has_elevator && <Badge variant="neutral" size="sm">Elevators</Badge>}
                  {b.has_wheelchair_ramps && <Badge variant="success" size="sm">Wheelchair Ramps</Badge>}
                </div>
              </Card>
            ))}

          {activeTab === 'classrooms' &&
            classrooms.map((cl) => (
              <Card key={cl.id} variant="default" className="p-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Badge variant="brand" size="sm">
                    {cl.code || `CR-${cl.id}`}
                  </Badge>
                  <span className="text-[11px] text-slate-400 font-mono">Capacity: {cl.capacity || 60}</span>
                </div>
                <h3 className="font-bold text-slate-100 text-sm sm:text-base tracking-tight">{cl.name}</h3>
                <p className="text-xs text-slate-400">{cl.building || 'Main Block'} - Floor {cl.floor || 1}</p>
                <div className="flex flex-wrap gap-1 pt-2 text-[10px]">
                  {cl.has_smart_board && <Badge variant="brand" size="sm">Smart Board</Badge>}
                  {cl.has_audio_system && <Badge variant="ai" size="sm">Assistive Audio</Badge>}
                  {cl.has_wheelchair_ramp && <Badge variant="success" size="sm">Ramp Access</Badge>}
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* Creation Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Create New ${activeTab.slice(0, -1)}`}
          size="md"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-3.5 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Code / Identifier</label>
              <input
                type="text"
                required
                placeholder="e.g. CS-101"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="input-field text-xs"
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
                className="input-field text-xs"
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
                  className="input-field text-xs"
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
                  className="input-field text-xs"
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
                    className="input-field text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="input-field text-xs"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-[#1b2538]">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
              >
                Submit & Create
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
