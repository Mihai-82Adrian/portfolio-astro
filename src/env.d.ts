declare module 'pdfmake/build/pdfmake.js' {
    const pdfMake: any;
    export default pdfMake;
    export = pdfMake;
}

declare module 'pdfmake/build/vfs_fonts.js' {
    const vfs: any;
    export default vfs;
    export = vfs;
}

declare module '@lucide/astro' {
    import type { HTMLAttributes } from 'astro/types';

    export interface LucideProps extends HTMLAttributes<'svg'> {
        size?: string | number;
        strokeWidth?: string | number;
        color?: string;
        absoluteStrokeWidth?: boolean;
        class?: string;
    }

    export const ArrowRight: (props: LucideProps) => any;
    export const BarChart3: (props: LucideProps) => any;
    export const BookOpen: (props: LucideProps) => any;
    export const Bot: (props: LucideProps) => any;
    export const Brain: (props: LucideProps) => any;
    export const BriefcaseBusiness: (props: LucideProps) => any;
    export const Calculator: (props: LucideProps) => any;
    export const Calendar: (props: LucideProps) => any;
    export const Camera: (props: LucideProps) => any;
    export const ChartColumn: (props: LucideProps) => any;
    export const Check: (props: LucideProps) => any;
    export const CheckCircle: (props: LucideProps) => any;
    export const CheckCircle2: (props: LucideProps) => any;
    export const ChevronDown: (props: LucideProps) => any;
    export const ChevronLeft: (props: LucideProps) => any;
    export const ChevronRight: (props: LucideProps) => any;
    export const ChevronUp: (props: LucideProps) => any;
    export const Circle: (props: LucideProps) => any;
    export const CircleCheck: (props: LucideProps) => any;
    export const ClipboardList: (props: LucideProps) => any;
    export const Clock: (props: LucideProps) => any;
    export const Code: (props: LucideProps) => any;
    export const Code2: (props: LucideProps) => any;
    export const CodeXml: (props: LucideProps) => any;
    export const Cog: (props: LucideProps) => any;
    export const Coins: (props: LucideProps) => any;
    export const Compass: (props: LucideProps) => any;
    export const Construction: (props: LucideProps) => any;
    export const Cookie: (props: LucideProps) => any;
    export const Cpu: (props: LucideProps) => any;
    export const CreditCard: (props: LucideProps) => any;
    export const Database: (props: LucideProps) => any;
    export const ExternalLink: (props: LucideProps) => any;
    export const Facebook: (props: LucideProps) => any;
    export const FileCode2: (props: LucideProps) => any;
    export const Flag: (props: LucideProps) => any;
    export const FlaskConical: (props: LucideProps) => any;
    export const Gauge: (props: LucideProps) => any;
    export const Github: (props: LucideProps) => any;
    export const Globe: (props: LucideProps) => any;
    export const GLOBE: (props: LucideProps) => any;
    export const HardDrive: (props: LucideProps) => any;
    export const Headphones: (props: LucideProps) => any;
    export const Landmark: (props: LucideProps) => any;
    export const Lightbulb: (props: LucideProps) => any;
    export const LineChart: (props: LucideProps) => any;
    export const Linkedin: (props: LucideProps) => any;
    export const Lock: (props: LucideProps) => any;
    export const Mail: (props: LucideProps) => any;
    export const MapPin: (props: LucideProps) => any;
    export const Menu: (props: LucideProps) => any;
    export const MessageSquare: (props: LucideProps) => any;
    export const Moon: (props: LucideProps) => any;
    export const Music2: (props: LucideProps) => any;
    export const Palette: (props: LucideProps) => any;
    export const Play: (props: LucideProps) => any;
    export const Printer: (props: LucideProps) => any;
    export const Radio: (props: LucideProps) => any;
    export const Recycle: (props: LucideProps) => any;
    export const Rocket: (props: LucideProps) => any;
    export const Scale: (props: LucideProps) => any;
    export const Search: (props: LucideProps) => any;
    export const Send: (props: LucideProps) => any;
    export const Settings2: (props: LucideProps) => any;
    export const ShoppingCart: (props: LucideProps) => any;
    export const Sparkles: (props: LucideProps) => any;
    export const Sun: (props: LucideProps) => any;
    export const Target: (props: LucideProps) => any;
    export const Terminal: (props: LucideProps) => any;
    export const Twitter: (props: LucideProps) => any;
    export const User: (props: LucideProps) => any;
    export const WandSparkles: (props: LucideProps) => any;
    export const X: (props: LucideProps) => any;
    export const Zap: (props: LucideProps) => any;
    // Fallback for other icons
    const content: any;
    export default content;
}
