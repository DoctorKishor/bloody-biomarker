import { Button } from 'antd'

interface GuavaPlaceholderTabProps {
    tabName: string
    title: string
    description: string
    actionLabel?: string
    onAction?: () => void
}

export const GuavaPlaceholderTab = (props: GuavaPlaceholderTabProps) => {
    const { title, description, actionLabel, onAction } = props

    return (
        <div className='flex flex-col items-center justify-center py-24 px-4 text-center select-none'>
            <div className='w-16 h-16 rounded-2xl bg-[#e8f5f1] flex items-center justify-center text-2xl text-[#0d9468] mb-4'>
                🍃
            </div>
            <h3 className='text-xl font-bold text-[#192823] mb-2'>{title}</h3>
            <p className='text-sm text-[#5f736b] max-w-md mb-6 leading-relaxed'>
                {description}
            </p>
            {actionLabel && onAction && (
                <Button
                    type='primary'
                    shape='round'
                    onClick={onAction}
                    style={{ backgroundColor: '#0d9468' }}
                >
                    {actionLabel}
                </Button>
            )}
        </div>
    )
}
