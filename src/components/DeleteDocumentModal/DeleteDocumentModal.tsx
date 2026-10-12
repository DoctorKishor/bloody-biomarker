import { useState } from 'react'

import {
    DeleteOutlined,
    ExclamationCircleOutlined,
    FileTextOutlined,
} from '@ant-design/icons'
import { Modal, Radio } from 'antd'

export interface DeleteDocumentModalProps {
    open: boolean
    documentName?: string
    recordCount?: number
    onClose: () => void
    onConfirm: (deleteRelatedData: boolean) => Promise<void> | void
    isDeleting?: boolean
}

export const DeleteDocumentModal = ({
    open,
    documentName = 'Document',
    recordCount,
    onClose,
    onConfirm,
    isDeleting = false,
}: DeleteDocumentModalProps) => {
    const [deleteOption, setDeleteOption] = useState<'file-only' | 'file-and-data'>('file-only')

    const handleConfirm = async () => {
        await onConfirm(deleteOption === 'file-and-data')
    }

    return (
        <Modal
            open={open}
            onCancel={isDeleting ? undefined : onClose}
            footer={null}
            destroyOnClose
            centered
            width={480}
            className='delete-document-modal'
        >
            <div className='flex flex-col gap-5 pt-1 pb-2'>
                {/* Header */}
                <div className='flex items-start gap-3.5'>
                    <div className='w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0 text-red-600 text-lg border border-red-100'>
                        <ExclamationCircleOutlined/>
                    </div>
                    <div className='flex flex-col min-w-0'>
                        <h3 className='text-base font-bold text-[#0f172a] m-0'>
                            Delete Document
                        </h3>
                        <p className='text-xs text-[#64748b] m-0 mt-0.5 truncate'>
                            Choose how to handle <span className='font-semibold text-[#1e293b]'>{documentName}</span>
                        </p>
                    </div>
                </div>

                {/* Option Cards */}
                <Radio.Group
                    value={deleteOption}
                    onChange={(e) => { setDeleteOption(e.target.value as 'file-only' | 'file-and-data') }}
                    className='w-full flex flex-col gap-2.5'
                >
                    {/* Option 1: File Only */}
                    <div
                        onClick={() => { setDeleteOption('file-only') }}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                            deleteOption === 'file-only'
                                ? 'bg-[#f0fdf4] border-[#86efac] shadow-2xs ring-1 ring-[#86efac]'
                                : 'bg-white border-[#e2e8f0] hover:bg-[#f8fafc]'
                        }`}
                    >
                        <Radio value='file-only' className='mt-0.5'/>
                        <div className='flex flex-col gap-1 min-w-0'>
                            <div className='flex items-center gap-2'>
                                <FileTextOutlined className='text-emerald-600 text-xs'/>
                                <span className='text-xs font-bold text-[#0f172a]'>
                                    Delete file only
                                </span>
                                <span className='text-[10px] font-semibold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-700'>
                                    Preserve DB records
                                </span>
                            </div>
                            <p className='text-[11px] text-[#64748b] leading-relaxed m-0'>
                                Removes the uploaded file attachment from storage. All extracted biomarker readings and historical trend records remain safely in your database.
                            </p>
                        </div>
                    </div>

                    {/* Option 2: File AND Related DB Data */}
                    <div
                        onClick={() => { setDeleteOption('file-and-data') }}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                            deleteOption === 'file-and-data'
                                ? 'bg-red-50/50 border-red-300 shadow-2xs ring-1 ring-red-300'
                                : 'bg-white border-[#e2e8f0] hover:bg-[#f8fafc]'
                        }`}
                    >
                        <Radio value='file-and-data' className='mt-0.5'/>
                        <div className='flex flex-col gap-1 min-w-0'>
                            <div className='flex items-center gap-2'>
                                <DeleteOutlined className='text-red-500 text-xs'/>
                                <span className='text-xs font-bold text-red-600'>
                                    Delete file and its related data from DB
                                </span>
                                <span className='text-[10px] font-semibold px-2 py-0.2 rounded-full bg-red-100 text-red-700'>
                                    Complete cleanup
                                </span>
                            </div>
                            <p className='text-[11px] text-[#64748b] leading-relaxed m-0'>
                                Permanently removes the file AND clears all biomarker readings that originated from this file. Parameter definitions (e.g., Platelets, Potassium) will be preserved, but data from this report will be removed.
                            </p>
                        </div>
                    </div>
                </Radio.Group>

                {/* Additional Notice if Related Data is Selected */}
                {deleteOption === 'file-and-data' && (
                    <div className='bg-red-50 border border-red-200 rounded-xl p-3 text-[11px] text-red-700 flex items-center gap-2'>
                        <span className='font-bold'>⚠️ Notice:</span>
                        <span>
                            {recordCount !== undefined && recordCount > 0
                                ? `${recordCount} biomarker record(s) linked to this document will be permanently deleted from the DB.`
                                : 'All biomarker records extracted from this specific file will be deleted from the DB.'}
                        </span>
                    </div>
                )}

                {/* Footer Buttons */}
                <div className='flex items-center justify-end gap-2.5 pt-2 border-t border-[#f1f5f9]'>
                    <button
                        type='button'
                        disabled={isDeleting}
                        onClick={onClose}
                        className='px-4 py-2 rounded-xl text-xs font-semibold text-[#475569] hover:bg-[#f1f5f9] transition-colors border border-[#cbd5e1] cursor-pointer disabled:opacity-50'
                    >
                        Cancel
                    </button>
                    <button
                        type='button'
                        disabled={isDeleting}
                        onClick={() => { void handleConfirm() }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
                            deleteOption === 'file-and-data'
                                ? 'bg-red-600 hover:bg-red-700 active:bg-red-800'
                                : 'bg-[#008272] hover:bg-[#006e60] active:bg-[#005a4e]'
                        }`}
                    >
                        {isDeleting && (
                            <span className='inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin'/>
                        )}
                        <span>
                            {deleteOption === 'file-and-data' ? 'Delete File & DB Data' : 'Delete File Only'}
                        </span>
                    </button>
                </div>
            </div>
        </Modal>
    )
}
