import { type HTMLAttributes } from 'react';

interface LogoProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export default function Logo({ className = '', ...props }: LogoProps) {
  return (
    <div className={`inline-flex items-center space-x-2 ${className}`} {...props}>
      <svg
        width="24"
        height="24"
        viewBox="0 0 2048 2048"
        className="h-6 w-6"
      >
        <g>
          <path
            className="text-primary fill-current"
            fillRule="evenodd"
            clipRule="evenodd"
            d="M750.52,1580.5c-22.51,0-49.02-18.55-47.93-40.67l21.79-613.31c-83.82-25.82-141.9-111.78-141.9-232.3
            c0-120.86,75.13-236.26,168.04-236.26c92.88,0,168,115.4,168,236.26c0,120.51-58.04,206.48-141.89,232.3l22.13,613.31
            C799.5,1561.96,772.99,1580.5,750.52,1580.5L750.52,1580.5z"
          />
          <path
            className="text-primary/80 fill-current"
            fillRule="evenodd"
            clipRule="evenodd"
            d="M1739.08,1018.66c-14.15-8-26.84-17.75-38.44-28.67c-11.63-11.25-21.42-25.01-29.41-42.1
            c-7.97-16.67-13.78-37.02-17.8-60.58c-3.99-23.61-6.17-51.56-6.17-84.59V660.48c0-41.73-0.72-76.6-2.51-104.5
            c-1.82-28.33-7.28-50.84-16.69-68.24c-9.46-17.08-23.61-29.41-43.2-36.28c-19.6-7.27-47.55-10.9-83.85-10.9v-66.4h10.54
            c42.83,0,78.03,5.07,106.69,14.51c28.29,9.8,50.44,23.95,67.12,42.78c16.34,18.57,27.96,41.76,34.47,69.69
            c6.55,27.96,9.82,59.56,9.82,95.13V854.3c0,15.93,2.55,31.56,7.63,47.13c4.7,15.62,12.33,29.43,23.21,42.1
            c10.54,12.38,23.97,22.51,39.93,30.5c15.96,7.98,34.84,11.98,57,11.98v64.96c-22.15,0-41.04,4-57,11.98
            c-15.96,8-29.39,18.14-39.93,30.84c-10.88,12.72-18.5,26.47-23.21,42.11c-5.08,15.23-7.63,31.2-7.63,47.2v258.76
            c0,36.28-3.27,68.23-9.82,95.79c-6.51,27.55-18.13,50.43-34.47,69.31c-16.68,18.87-38.83,33.02-67.12,42.84
            c-28.66,9.44-63.86,14.51-106.69,14.51h-10.54v-66.45c36.29,0,64.24-3.6,83.85-10.88c19.59-6.87,33.75-19.22,43.2-36.65
            c9.41-17.05,14.87-39.52,16.69-67.85c1.79-27.97,2.51-62.82,2.51-104.55V1235.7c0-33.04,2.18-61.31,6.17-85.28
            c4.01-23.98,9.82-44.64,17.8-61.36c7.99-17.02,17.78-30.82,29.41-42.07C1712.24,1036.12,1724.93,1026.67,1739.08,1018.66
            L1739.08,1018.66z"
          />
          <path
            className="text-primary/80 fill-current"
            fillRule="evenodd"
            clipRule="evenodd"
            d="M321.16,1018.66c14.16,8,27.22,17.46,38.85,28.33c11.24,11.24,21.05,25.05,29.01,42.07
            c8,16.72,14.18,37.37,18.15,61.36c4.01,23.97,5.82,52.24,5.82,85.28v142.25c0,41.73,1.09,76.58,2.55,104.55
            c1.81,28.33,7.62,50.8,16.67,67.85c9.44,17.43,23.98,29.78,43.22,36.65c19.6,7.28,47.54,10.88,83.82,10.88v66.45h-10.51
            c-42.47,0-78.04-5.07-106.37-14.51c-28.29-9.83-50.8-23.97-67.12-42.84c-16.7-18.88-27.94-41.76-34.85-69.31
            c-6.53-27.56-9.78-59.51-9.78-95.79v-258.76c0-16-2.55-31.97-7.28-47.2c-5.08-15.64-12.69-29.39-23.22-42.11
            c-10.88-12.7-23.94-22.83-39.94-30.84c-15.96-7.98-35.2-11.98-57.31-11.98v-64.96c22.1,0,41.34-4,57.31-11.98
            c16-7.99,29.06-18.12,39.94-30.5c10.53-12.67,18.14-26.49,23.22-42.1c4.73-15.57,7.28-31.21,7.28-47.13V596.26
            c0-35.57,3.25-67.17,9.78-95.13c6.9-27.93,18.15-51.12,34.85-69.69c16.32-18.83,38.83-32.98,67.12-42.78
            c28.33-9.44,63.9-14.51,106.37-14.51h10.51v66.4c-36.28,0-64.22,3.63-83.82,10.9c-19.23,6.87-33.77,19.21-43.22,36.28
            c-9.05,17.39-14.86,39.9-16.67,68.24c-1.46,27.91-2.55,62.77-2.55,104.5v142.25c0,33.04-1.81,60.99-5.82,84.59
            c-3.97,23.56-10.15,43.9-18.15,60.58c-7.96,17.09-17.78,30.84-29.01,42.1C348.39,1000.91,335.32,1010.67,321.16,1018.66
            L321.16,1018.66z"
          />
          <path
            className="text-primary fill-current"
            fillRule="evenodd"
            clipRule="evenodd"
            d="M1403.77,1524.22c0,31.23-21.42,56.28-47.56,56.28c-25.75,0-47.53-25.06-47.17-56.28l14.51-1065.53
            c22.14-5.05,41.01,17.06,56.26,55.9c35.56,89.64,56.98,324.43,48.25,429.68c-10.15,122.33-66.4,118.34-62.05,171.67
            C1377.99,1262.56,1403.77,1405.6,1403.77,1524.22L1403.77,1524.22z"
          />
          <path
            className="text-primary fill-current"
            fillRule="evenodd"
            clipRule="evenodd"
            d="M1107.26,476.11c0-9.81-7.99-17.41-17.43-17.41c-9.78,0-17.41,7.61-17.41,17.41v279.45
            c0,17.43-14.15,31.22-31.57,31.22c-17.06,0-31.24-13.79-31.24-31.22V476.11c0-9.81-7.59-17.41-17.42-17.41
            c-9.77,0-17.4,7.61-17.4,17.41v424.26c0,48.27,46.1,83.46,93.61,85.3l-25.01,553.82c-1.09,22.48,23.56,41.03,46.43,41.03
            c22.52,0,47.54-18.55,46.45-41.03l-25.03-553.82c47.17-1.84,93.64-37.03,93.64-85.3V476.11c0-9.81-7.99-17.41-17.42-17.41
            c-9.82,0-17.78,7.61-17.78,17.41v279.45c0,17.43-13.81,31.22-31.23,31.22c-17.07,0-31.2-13.79-31.2-31.22V476.11z"
          />
        </g>
      </svg>
      <span className="text-xl font-bold">ChefScript</span>
    </div>
  );
}