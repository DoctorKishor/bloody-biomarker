import { useState, useEffect } from 'react'

import {
    CloseOutlined,
    DeleteOutlined,
    UserOutlined,
    ExclamationCircleOutlined,
} from '@ant-design/icons'
import { Modal } from 'antd'

import { User } from '@/db/models/user'

export interface EditProfileModalProps {
    isOpen: boolean
    onClose: () => void
    user: User | null
    canDelete: boolean
    onSave: (updates: Partial<User>) => Promise<void>
    onDelete: () => Promise<void>
}

export interface AddProfileModalProps {
    isOpen: boolean
    onClose: () => void
    onCreate: (params: {
        name: string
        gender: 'male' | 'female'
        age: number
        birthDate?: string
        bloodType?: string
        height?: string
        email?: string
    }) => Promise<void>
}

export const EditProfileModal = (props: EditProfileModalProps) => {
    const { isOpen, onClose, user, canDelete, onSave, onDelete } = props

    const [name, setName] = useState('')
    const [gender, setGender] = useState<'male' | 'female'>('male')
    const [age, setAge] = useState<number>(35)
    const [birthDate, setBirthDate] = useState('')
    const [bloodType, setBloodType] = useState('O+')
    const [height, setHeight] = useState('167 cm')
    const [email, setEmail] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (user && isOpen) {
            setName(user.name ?? 'Dr. Kishor Anbazhakan')
            setGender(user.gender ?? 'male')
            setAge(user.age ?? 35)
            setBirthDate(user.birthDate ?? '')
            setBloodType(user.bloodType ?? 'O+')
            setHeight(user.height ?? '167 cm')
            setEmail(user.email ?? '')
        }
    }, [user, isOpen])

    if (!isOpen || !user) return null

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setIsSaving(true)
        try {
            await onSave({
                name: name.trim(),
                gender,
                age: Number(age) || 30,
                birthDate: birthDate.trim() || undefined,
                bloodType: bloodType.trim() || undefined,
                height: height.trim() || undefined,
                email: email.trim() || undefined,
            })
            onClose()
        } finally {
            setIsSaving(false)
        }
    }

    const confirmDelete = () => {
        Modal.confirm({
            title: `Delete profile "${user.name}"?`,
            icon: <ExclamationCircleOutlined className='text-red-500'/>,
            content: 'All documents, blood records, biomarkers, and health data for this profile will be permanently deleted and cannot be recovered.',
            okText: 'Delete Permanently',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                await onDelete()
                onClose()
            },
        })
    }

    return (
        <div
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4 transition-all'
        >
            <div className='w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in'>
                {/* Header */}
                <div className='bg-[#0d9468] px-5 py-4 flex items-center justify-between text-white'>
                    <div className='flex items-center gap-2.5'>
                        <UserOutlined className='text-lg'/>
                        <h2 className='text-lg font-bold text-white m-0'>Edit Profile Details</h2>
                    </div>
                    <button
                        type='button'
                        onClick={onClose}
                        className='p-1 rounded-full hover:bg-white/15 text-white transition-colors'
                    >
                        <CloseOutlined/>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={(e) => { void handleSave(e) }} className='p-6 flex flex-col gap-4 text-sm'>
                    {/* Full Name */}
                    <div className='flex flex-col gap-1.5'>
                        <label className='text-xs font-semibold text-[#1e293b]'>
                            Full Name <span className='text-red-500'>*</span>
                        </label>
                        <input
                            type='text'
                            value={name}
                            onChange={(e) => { setName(e.target.value) }}
                            placeholder='Dr. Kishor Anbazhakan'
                            required
                            className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#0d9468] transition-colors'
                        />
                    </div>

                    {/* Gender Segmented Control */}
                    <div className='flex flex-col gap-1.5'>
                        <label className='text-xs font-semibold text-[#1e293b]'>Biological Sex / Gender</label>
                        <div className='grid grid-cols-2 gap-2'>
                            <button
                                type='button'
                                onClick={() => { setGender('male') }}
                                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all border ${
                                    gender === 'male'
                                        ? 'bg-[#f0fdf4] border-[#0d9468] text-[#166534] shadow-xs'
                                        : 'bg-white border-[#cbd5e1] text-[#475569] hover:bg-[#f8faf9]'
                                }`}
                            >
                                ♂ Male
                            </button>
                            <button
                                type='button'
                                onClick={() => { setGender('female') }}
                                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all border ${
                                    gender === 'female'
                                        ? 'bg-[#f0fdf4] border-[#0d9468] text-[#166534] shadow-xs'
                                        : 'bg-white border-[#cbd5e1] text-[#475569] hover:bg-[#f8faf9]'
                                }`}
                            >
                                ♀ Female
                            </button>
                        </div>
                    </div>

                    {/* Age and Birth Date */}
                    <div className='grid grid-cols-2 gap-3'>
                        <div className='flex flex-col gap-1.5'>
                            <label className='text-xs font-semibold text-[#1e293b]'>Age (years)</label>
                            <input
                                type='number'
                                value={age}
                                onChange={(e) => { setAge(Number(e.target.value)) }}
                                min={1}
                                max={125}
                                required
                                className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#0d9468] transition-colors'
                            />
                        </div>
                        <div className='flex flex-col gap-1.5'>
                            <label className='text-xs font-semibold text-[#1e293b]'>Birth Date</label>
                            <input
                                type='date'
                                value={birthDate}
                                onChange={(e) => { setBirthDate(e.target.value) }}
                                className='w-full px-3.5 py-2 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#0d9468] transition-colors'
                            />
                        </div>
                    </div>

                    {/* Blood Type and Height */}
                    <div className='grid grid-cols-2 gap-3'>
                        <div className='flex flex-col gap-1.5'>
                            <label className='text-xs font-semibold text-[#1e293b]'>Blood Type</label>
                            <select
                                value={bloodType}
                                onChange={(e) => { setBloodType(e.target.value) }}
                                className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#0d9468] bg-white transition-colors'
                            >
                                <option value='O+'>O+</option>
                                <option value='O-'>O-</option>
                                <option value='A+'>A+</option>
                                <option value='A-'>A-</option>
                                <option value='B+'>B+</option>
                                <option value='B-'>B-</option>
                                <option value='AB+'>AB+</option>
                                <option value='AB-'>AB-</option>
                                <option value='Unknown'>Unknown</option>
                            </select>
                        </div>
                        <div className='flex flex-col gap-1.5'>
                            <label className='text-xs font-semibold text-[#1e293b]'>Height</label>
                            <input
                                type='text'
                                value={height}
                                onChange={(e) => { setHeight(e.target.value) }}
                                placeholder='167 cm'
                                className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#0d9468] transition-colors'
                            />
                        </div>
                    </div>

                    {/* Email (Optional) */}
                    <div className='flex flex-col gap-1.5'>
                        <label className='text-xs font-semibold text-[#1e293b]'>Email (Optional)</label>
                        <input
                            type='email'
                            value={email}
                            onChange={(e) => { setEmail(e.target.value) }}
                            placeholder='doctor@example.com'
                            className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#0d9468] transition-colors'
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className='flex items-center justify-between pt-3 border-t border-[#f1f5f9] mt-1'>
                        {canDelete ? (
                            <button
                                type='button'
                                onClick={confirmDelete}
                                className='inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 py-2 px-3 rounded-lg hover:bg-red-50 transition-colors'
                            >
                                <DeleteOutlined/>
                                <span>Delete Profile</span>
                            </button>
                        ) : (
                            <div/>
                        )}

                        <div className='flex items-center gap-2'>
                            <button
                                type='button'
                                onClick={onClose}
                                className='px-4 py-2 rounded-lg border border-[#cbd5e1] text-xs font-semibold text-[#475569] hover:bg-[#f8faf9] transition-colors'
                            >
                                Cancel
                            </button>
                            <button
                                type='submit'
                                disabled={isSaving}
                                className='px-5 py-2 rounded-lg bg-[#0d9468] hover:bg-[#0b7a56] text-xs font-bold text-white shadow-xs transition-colors'
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}

export const AddProfileModal = (props: AddProfileModalProps) => {
    const { isOpen, onClose, onCreate } = props

    const [name, setName] = useState('')
    const [gender, setGender] = useState<'male' | 'female'>('male')
    const [age, setAge] = useState<number>(30)
    const [birthDate, setBirthDate] = useState('')
    const [bloodType, setBloodType] = useState('O+')
    const [height, setHeight] = useState('170 cm')
    const [email, setEmail] = useState('')
    const [isCreating, setIsCreating] = useState(false)

    if (!isOpen) return null

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setIsCreating(true)
        try {
            await onCreate({
                name: name.trim(),
                gender,
                age: Number(age) || 30,
                birthDate: birthDate.trim() || undefined,
                bloodType: bloodType.trim() || undefined,
                height: height.trim() || undefined,
                email: email.trim() || undefined,
            })
            setName('')
            onClose()
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <div
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4 transition-all'
        >
            <div className='w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in'>
                {/* Header */}
                <div className='bg-[#0d9468] px-5 py-4 flex items-center justify-between text-white'>
                    <div className='flex items-center gap-2.5'>
                        <UserOutlined className='text-lg'/>
                        <h2 className='text-lg font-bold text-white m-0'>Add New Profile</h2>
                    </div>
                    <button
                        type='button'
                        onClick={onClose}
                        className='p-1 rounded-full hover:bg-white/15 text-white transition-colors'
                    >
                        <CloseOutlined/>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={(e) => { void handleCreate(e) }} className='p-6 flex flex-col gap-4 text-sm'>
                    <p className='text-xs text-[#64748b] -mt-1 mb-1'>
                        Each profile maintains completely independent health records, documents, and biomarkers. Data will never crossover.
                    </p>

                    {/* Full Name */}
                    <div className='flex flex-col gap-1.5'>
                        <label className='text-xs font-semibold text-[#1e293b]'>
                            Full Name <span className='text-red-500'>*</span>
                        </label>
                        <input
                            type='text'
                            value={name}
                            onChange={(e) => { setName(e.target.value) }}
                            placeholder='Jane Doe'
                            required
                            autoFocus
                            className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#0d9468] transition-colors'
                        />
                    </div>

                    {/* Gender Segmented Control */}
                    <div className='flex flex-col gap-1.5'>
                        <label className='text-xs font-semibold text-[#1e293b]'>Biological Sex / Gender</label>
                        <div className='grid grid-cols-2 gap-2'>
                            <button
                                type='button'
                                onClick={() => { setGender('male') }}
                                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all border ${
                                    gender === 'male'
                                        ? 'bg-[#f0fdf4] border-[#0d9468] text-[#166534] shadow-xs'
                                        : 'bg-white border-[#cbd5e1] text-[#475569] hover:bg-[#f8faf9]'
                                }`}
                            >
                                ♂ Male
                            </button>
                            <button
                                type='button'
                                onClick={() => { setGender('female') }}
                                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all border ${
                                    gender === 'female'
                                        ? 'bg-[#f0fdf4] border-[#0d9468] text-[#166534] shadow-xs'
                                        : 'bg-white border-[#cbd5e1] text-[#475569] hover:bg-[#f8faf9]'
                                }`}
                            >
                                ♀ Female
                            </button>
                        </div>
                    </div>

                    {/* Age and Birth Date */}
                    <div className='grid grid-cols-2 gap-3'>
                        <div className='flex flex-col gap-1.5'>
                            <label className='text-xs font-semibold text-[#1e293b]'>Age (years)</label>
                            <input
                                type='number'
                                value={age}
                                onChange={(e) => { setAge(Number(e.target.value)) }}
                                min={1}
                                max={125}
                                required
                                className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#0d9468] transition-colors'
                            />
                        </div>
                        <div className='flex flex-col gap-1.5'>
                            <label className='text-xs font-semibold text-[#1e293b]'>Birth Date</label>
                            <input
                                type='date'
                                value={birthDate}
                                onChange={(e) => { setBirthDate(e.target.value) }}
                                className='w-full px-3.5 py-2 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#0d9468] transition-colors'
                            />
                        </div>
                    </div>

                    {/* Blood Type and Height */}
                    <div className='grid grid-cols-2 gap-3'>
                        <div className='flex flex-col gap-1.5'>
                            <label className='text-xs font-semibold text-[#1e293b]'>Blood Type</label>
                            <select
                                value={bloodType}
                                onChange={(e) => { setBloodType(e.target.value) }}
                                className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#0d9468] bg-white transition-colors'
                            >
                                <option value='O+'>O+</option>
                                <option value='O-'>O-</option>
                                <option value='A+'>A+</option>
                                <option value='A-'>A-</option>
                                <option value='B+'>B+</option>
                                <option value='B-'>B-</option>
                                <option value='AB+'>AB+</option>
                                <option value='AB-'>AB-</option>
                                <option value='Unknown'>Unknown</option>
                            </select>
                        </div>
                        <div className='flex flex-col gap-1.5'>
                            <label className='text-xs font-semibold text-[#1e293b]'>Height</label>
                            <input
                                type='text'
                                value={height}
                                onChange={(e) => { setHeight(e.target.value) }}
                                placeholder='170 cm'
                                className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#0d9468] transition-colors'
                            />
                        </div>
                    </div>

                    {/* Email (Optional) */}
                    <div className='flex flex-col gap-1.5'>
                        <label className='text-xs font-semibold text-[#1e293b]'>Email (Optional)</label>
                        <input
                            type='email'
                            value={email}
                            onChange={(e) => { setEmail(e.target.value) }}
                            placeholder='user@example.com'
                            className='w-full px-3.5 py-2.5 rounded-lg border border-[#cbd5e1] text-sm text-[#1e293b] focus:outline-none focus:border-[#0d9468] transition-colors'
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className='flex items-center justify-end gap-2 pt-3 border-t border-[#f1f5f9] mt-1'>
                        <button
                            type='button'
                            onClick={onClose}
                            className='px-4 py-2 rounded-lg border border-[#cbd5e1] text-xs font-semibold text-[#475569] hover:bg-[#f8faf9] transition-colors'
                        >
                            Cancel
                        </button>
                        <button
                            type='submit'
                            disabled={isCreating}
                            className='px-5 py-2 rounded-lg bg-[#0d9468] hover:bg-[#0b7a56] text-xs font-bold text-white shadow-xs transition-colors'
                        >
                            {isCreating ? 'Creating...' : 'Create Profile'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
