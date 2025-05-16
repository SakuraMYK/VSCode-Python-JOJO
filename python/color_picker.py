import tkinter
from tkinter import ttk
from tkinter import Canvas, Frame, Scale, VERTICAL
import colorsys


class ColorPicker:
    def __init__(self, init_color=None):
        self.root = tkinter.Tk()
        self.root.overrideredirect(True)  # 无标题栏
        self.root.attributes("-topmost", True)
        self._set_window_position()
        self.bg_color = "#333333"

        self.root.configure(bg=self.bg_color)  # 深色背景

        # 字体
        self.font_family = ("Microsoft YaHei UI", 11)
        self.font_family_bold = ("Microsoft YaHei UI", 12, "bold")

        # ttk现代风格
        style = ttk.Style(self.root)
        style.theme_use("clam")
        style.configure("TFrame", background=self.bg_color)
        style.configure(
            "TLabel",
            background=self.bg_color,
            foreground="#e0e0e0",
            font=self.font_family,
        )
        style.configure(
            "TButton",
            background="#3b4252",
            foreground="#e0e0e0",
            font=self.font_family_bold,
            borderwidth=0,
            focusthickness=1,
            focuscolor="#5e81ac",
        )
        style.map(
            "TButton",
            background=[("active", "#434c5e"), ("pressed", "#4c566a")],
            foreground=[("disabled", "#888")],
        )

        # HSV色彩空间
        self.hue = 0
        self.sat = 1
        self.val = 1

        # 新增：用于存储返回值
        self._result = None

        # 主frame
        main_frame = ttk.Frame(self.root, padding=16, style="TFrame")
        main_frame.grid(row=0, column=0)

        # 色盘
        self.canvas_size = 200
        self.color_canvas = Canvas(
            main_frame,
            width=self.canvas_size,
            height=self.canvas_size,
            bd=0,
            highlightthickness=0,
            bg=self.bg_color,
        )
        self.color_canvas.grid(row=0, column=0, rowspan=2, padx=(0, 18))
        self._draw_color_palette()
        self.color_canvas.bind("<Button-1>", self._on_palette_click)
        self.color_canvas.bind("<B1-Motion>", self._on_palette_click)

        # 亮度滑轨（用tk.Scale保证滑块跟随鼠标）
        self.value_scale = Scale(
            main_frame,
            from_=1,
            to=0,
            resolution=0.01,
            orient=VERTICAL,
            showvalue=0,
            command=self._on_value_change,
            length=self.canvas_size,
            troughcolor="#3b5191",
            bg=self.bg_color,
            cursor="hand2",
            fg="#e0e0e0",
            bd=0,
            highlightthickness=0,
            sliderrelief="flat",
            sliderlength=28,  # 更现代的滑块
            font=self.font_family,
        )
        self.value_scale.set(self.val)
        self.value_scale.grid(
            row=0, column=1, rowspan=2, sticky="ns", padx=(0, 0), pady=(0, 0)
        )

        # 预览区和RGB/HEX切换按钮
        bottom_frame = ttk.Frame(main_frame, style="TFrame")
        bottom_frame.grid(row=2, column=0, columnspan=2, pady=(18, 0), sticky="ew")

        self.preview = Frame(
            bottom_frame,
            width=60,
            height=60,
            bg=self.bg_color,
            relief="flat",
            bd=0,
            highlightbackground="#444",
            highlightthickness=1,
        )
        self.preview.grid(row=0, column=0, padx=(0, 16), sticky="e")
        self.preview.grid_propagate(False)

        # 用于切换显示的button
        self.display_mode = "rgb"  # "rgb" or "hex"
        self.display_btn = ttk.Button(
            bottom_frame,
            text="",
            width=18,
            command=self._toggle_display_mode,
            style="TButton",
        )
        self.display_btn.grid(row=0, column=1, sticky="w", pady=(0, 0))

        # 记录当前按钮颜色模式，避免重复设置
        self._last_btn_style = None

        # 鼠标离开整个窗口时自动输出并关闭
        self.root.bind("<FocusOut>", self._on_leave)
        self.root.bind("<Leave>", self._on_leave_window)

        # 初始化颜色
        if init_color:
            self._set_color_from_input(init_color)
        else:
            self._update_preview()

        self.root.mainloop()

    def get_result(self):
        return self._result

    def _set_window_position(self):
        # 获取当前鼠标位置
        try:
            x = self.root.winfo_pointerx()
            y = self.root.winfo_pointery()
        except Exception:
            x, y = 100, 100
        self.root.geometry(f"+{x}+{y}")

    def _draw_color_palette(self):
        size = self.canvas_size
        self.palette_img = tkinter.PhotoImage(width=size, height=size)
        for x in range(size):
            h = x / size
            for y in range(size):
                s = y / size
                r, g, b = colorsys.hsv_to_rgb(h, s, 1)
                color = "#%02x%02x%02x" % (int(r * 255), int(g * 255), int(b * 255))
                self.palette_img.put(color, (x, y))
        self.color_canvas.create_image(0, 0, anchor="nw", image=self.palette_img)
        self.selector = self.color_canvas.create_oval(
            0, 0, 10, 10, outline="#000", width=2
        )

    def _on_palette_click(self, event):
        x = min(max(event.x, 0), self.canvas_size - 1)
        y = min(max(event.y, 0), self.canvas_size - 1)
        self.hue = x / self.canvas_size
        self.sat = y / self.canvas_size
        self.color_canvas.coords(self.selector, x - 5, y - 5, x + 5, y + 5)
        self._update_preview()

    def _on_value_change(self, val):
        self.val = float(val)
        self._update_preview()

    def _update_preview(self):
        r, g, b = colorsys.hsv_to_rgb(self.hue, self.sat, self.val)
        r, g, b = int(r * 255), int(g * 255), int(b * 255)
        color = "#%02x%02x%02x" % (r, g, b)
        self.preview.config(bg=color)
        rgb_text = f"R: {r:3d}  G: {g:3d}  B: {b:3d}"
        hex_text = f"{color.upper()}"
        if self.display_mode == "rgb":
            self.display_btn.config(text=rgb_text, style="TButton")
        else:
            # 切换为绿色字体的自定义样式
            if self._last_btn_style != "Green.TButton":
                style = ttk.Style(self.root)
                style.configure(
                    "Green.TButton",
                    foreground="#56f600",
                    background="#3b4252",
                    font=self.font_family_bold,
                )
                style.map(
                    "Green.TButton",
                    background=[("active", "#434c5e"), ("pressed", "#4c566a")],
                    foreground=[("disabled", "#888")],
                )
                self._last_btn_style = "Green.TButton"
            self.display_btn.config(text=hex_text, style="Green.TButton")
        if self.display_mode == "rgb":
            self._last_btn_style = "TButton"

    def _toggle_display_mode(self):
        self.display_mode = "hex" if self.display_mode == "rgb" else "rgb"
        self._update_preview()

    def _on_leave(self, event):
        # 只有当窗口失去焦点时才关闭
        if not self.root.focus_displayof():
            self._print_color_and_destroy()

    def _on_leave_window(self, event):
        # 判断鼠标是否真的离开整个窗口（而不是子控件）
        x, y = self.root.winfo_pointerxy()
        rx = self.root.winfo_rootx()
        ry = self.root.winfo_rooty()
        rw = self.root.winfo_width()
        rh = self.root.winfo_height()
        if not (rx <= x < rx + rw and ry <= y < ry + rh):
            self._print_color_and_destroy()

    def _print_color_and_destroy(self):
        r, g, b = colorsys.hsv_to_rgb(self.hue, self.sat, self.val)
        r, g, b = int(r * 255), int(g * 255), int(b * 255)
        if self.display_mode == "hex":
            self._result = f"#{r:02X}{g:02X}{b:02X}"
        else:
            self._result = f'rgb({r}, {g}, {b})'
        self.root.destroy()

    def _set_color_from_input(self, color):
        # 支持 "#RRGGBB" 或 (r,g,b) 或 "RRGGBB"
        self._input_color = color  # 记录输入格式
        if isinstance(color, str):
            c = color.lstrip("#")
            if len(c) == 6:
                r, g, b = int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)
            else:
                raise ValueError("Invalid color string")
            self.display_mode = "hex"
        elif isinstance(color, (tuple, list)) and len(color) == 3:
            r, g, b = color
            self.display_mode = "rgb"
        else:
            raise ValueError("Unsupported color format")
        r, g, b = [int(v) for v in (r, g, b)]
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        self.hue, self.sat, self.val = h, s, v
        # 更新控件
        x = int(self.hue * self.canvas_size)
        y = int(self.sat * self.canvas_size)
        self.color_canvas.coords(self.selector, x - 5, y - 5, x + 5, y + 5)
        self.value_scale.set(self.val)
        self._update_preview()


if __name__ == "__main__":
    # ColorPicker("#dfdfff")
    picker = ColorPicker((255, 136, 0))
    import json
    print(json.dumps(picker.get_result()))
